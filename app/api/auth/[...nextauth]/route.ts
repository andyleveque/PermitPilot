import NextAuth from 'next-auth';
import GitHubProvider from 'next-auth/providers/github';
import type { NextAuthOptions } from 'next-auth';

export const authOptions: NextAuthOptions = {
providers: [
GitHubProvider({
clientId: process.env.GITHUB_ID!,
clientSecret: process.env.GITHUB_SECRET!,
}),
],
secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST, authOptions };