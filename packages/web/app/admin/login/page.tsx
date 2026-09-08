import { LoginForm } from "@/components/auth/login-form";

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-950 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-sm space-y-6 p-8 bg-stone-900/50 backdrop-blur-md rounded-xl shadow-2xl border border-stone-800">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-white">Admin Portal</h1>
          <p className="text-sm text-stone-400">Restricted access for authorized administrators</p>
        </div>
        <LoginForm isAdmin={true} />
      </div>
    </div>
  );
}
