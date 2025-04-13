import LoginForm from './components/LoginForm';

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pantone-311u to-pantone-311c p-4">
      <div className="w-full max-w-md">
        <LoginForm />
        <p className="text-center mt-6 text-white text-sm">
          © {new Date().getFullYear()} iMedicWS - Sistema de Gestión Médica
        </p>
      </div>
    </main>
  );
}
