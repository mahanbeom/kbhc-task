import { createFileRoute } from '@tanstack/react-router';

import { SignInPage } from '@/pages/sign-in/SignInPage';

export const Route = createFileRoute('/sign-in')({ component: SignInPage });
