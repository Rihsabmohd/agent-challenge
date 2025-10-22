import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { CopilotKit } from '@copilotkit/react-core';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'DeSci Research Partner - AI Academic Research Assistant',
  description:
    'An AI-powered agent that helps researchers find and summarize academic papers on any scientific topic. Built with Mastra and deployed on Nosana.',
  keywords: [
    'research',
    'academic',
    'AI',
    'papers',
    'science',
    'DeSci',
    'Nosana',
    'Mastra',
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <CopilotKit 
          runtimeUrl="/api/copilotkit"
          agent="researchAgent"
        >
          {children}
        </CopilotKit>
      </body>
    </html>
  );
}