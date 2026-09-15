import { RegisterForm } from './register-form';

type RegisterPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function RegisterPage({
  searchParams,
}: RegisterPageProps) {
  const { error } = await searchParams;
  return <RegisterForm oauthError={error === 'oauth'} />;
}
