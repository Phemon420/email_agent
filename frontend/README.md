# AI Email Assistant Frontend

A Next.js React frontend for the AI Email Assistant application that helps generate professional emails using AI and send them via Gmail API.

## Features

- **Google OAuth Authentication**: Secure login using Google OAuth2
- **AI-Powered Email Generation**: Interactive chat interface to generate emails with AI
- **Streaming Responses**: Real-time streaming of AI responses
- **Email Composition**: Rich email composer with multiple recipients support
- **Email Sending**: Direct email sending through Gmail API
- **Session Management**: Continue conversations to refine generated emails
- **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **HTTP Client**: Axios
- **State Management**: React useState/useEffect

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Backend server running (see backend README)

### Installation

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Edit `.env.local` and set:
```
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/                    # App Router pages
│   ├── dashboard/         # Main dashboard page
│   ├── login/             # Login page
│   ├── oauth2callback/    # OAuth callback handler
│   └── page.tsx           # Home page (redirects)
├── components/            # Reusable components
│   ├── StreamingChat.tsx  # AI chat interface
│   └── EmailComposer.tsx  # Email composition UI
└── lib/
    └── api.ts             # API client configuration
```

## Usage

1. **Login**: Use Google OAuth to authenticate
2. **Generate Email**: Use the AI Chat tab to describe the email you want
3. **Refine**: Continue the conversation to refine the generated email
4. **Send**: Switch to Compose & Send tab to edit and send the email

## Development

### Building for Production
```bash
npm run build
```

### Linting
```bash
npm run lint
```

## Environment Variables

- `NEXT_PUBLIC_API_BASE_URL`: Backend API base URL