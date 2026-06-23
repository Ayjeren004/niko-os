import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Local Account",
      credentials: {
        username: { label: "Username", type: "text", placeholder: "admin" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          throw new Error("Missing credentials");
        }

        const { username, password } = credentials;

        // DEMO MODE BYPASS
        if (username === 'DEMO_MODE_LOGIN' && password === 'DEMO_MODE_LOGIN_BYPASS') {
          // Upsert the demo user account
          const demoUser = await prisma.user.upsert({
            where: { id: 'demo-user-id' },
            update: {},
            create: {
              id: 'demo-user-id',
              username: 'demo_user',
              password: 'demo_no_password'
            }
          });
          return { id: demoUser.id, name: demoUser.username };
        }

        // Check if user exists
        const user = await prisma.user.findUnique({ where: { username } });
        
        if (!user) {
           // Check if we still have a placeholder account to claim
           const defaultUser = await prisma.user.findUnique({ where: { id: 'default-user-id' } });
           if (defaultUser && defaultUser.password === 'placeholder') {
               const hashedPassword = await bcrypt.hash(password, 10);
               const updatedUser = await prisma.user.update({
                 where: { id: defaultUser.id },
                 data: { username, password: hashedPassword }
               });
               return { id: updatedUser.id, name: updatedUser.username };
           }
           
           // If no users at all (shouldn't happen, but just in case)
           const totalUsers = await prisma.user.count();
           if (totalUsers === 0) {
              const hashedPassword = await bcrypt.hash(password, 10);
              const newUser = await prisma.user.create({
                data: {
                  id: 'default-user-id',
                  username,
                  password: hashedPassword
                }
              });
              return { id: newUser.id, name: newUser.username };
           }
           
           throw new Error("Invalid credentials");
        }

        if (user.password === 'placeholder') {
           // Claim existing placeholder by updating password
           const hashedPassword = await bcrypt.hash(password, 10);
           const updatedUser = await prisma.user.update({
             where: { id: user.id },
             data: { password: hashedPassword }
           });
           return { id: updatedUser.id, name: updatedUser.username };
        }

        // Normal login
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) throw new Error("Invalid password");

        return { id: user.id, name: user.username };
      }
    })
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user = { id: token.id as string, name: token.username as string };
      }
      return session;
    }
  },
  secret: process.env.NEXTAUTH_SECRET || "default-local-secret-key-12345"
};
