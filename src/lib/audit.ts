import prisma from './prisma';

interface CreateAuditLogParams {
  userId: string;
  skill: string;
  action: string;
  args?: any;
  result?: any;
  status: 'auto-run' | 'confirmed' | 'canceled' | 'failed';
}

export async function createAuditLog({ userId, skill, action, args, result, status }: CreateAuditLogParams) {
  try {
    // Redact large or sensitive content
    let sanitizedArgs = args;
    let sanitizedResult = result;

    if (args) {
      if (typeof args === 'string') {
        try {
          sanitizedArgs = JSON.parse(args);
        } catch(e) {}
      }
      // If object, truncate long strings (like full docs or transcripts)
      if (typeof sanitizedArgs === 'object' && sanitizedArgs !== null) {
        sanitizedArgs = { ...sanitizedArgs };
        for (const key in sanitizedArgs) {
          if (typeof sanitizedArgs[key] === 'string' && sanitizedArgs[key].length > 500) {
            sanitizedArgs[key] = sanitizedArgs[key].substring(0, 500) + '... [TRUNCATED]';
          }
        }
      }
    }

    if (result) {
      if (typeof result === 'string' && result.length > 500) {
        sanitizedResult = result.substring(0, 500) + '... [TRUNCATED]';
      }
    }

    await prisma.auditLog.create({
      data: {
        userId,
        skill,
        action,
        args: sanitizedArgs ? JSON.stringify(sanitizedArgs) : null,
        result: sanitizedResult ? (typeof sanitizedResult === 'string' ? sanitizedResult : JSON.stringify(sanitizedResult)) : null,
        status,
      }
    });

    // Automatically trigger a cleanup of old logs in the background
    // We do this here as a convenient trigger point
    cleanOldAuditLogs(userId).catch(console.error);
    
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
}

// Keep 30 days of logs by default
export async function cleanOldAuditLogs(userId: string, retentionDays: number = 30) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    await prisma.auditLog.deleteMany({
      where: {
        userId,
        createdAt: {
          lt: cutoffDate
        }
      }
    });
  } catch (error) {
    console.error('Failed to clean old audit logs:', error);
  }
}
