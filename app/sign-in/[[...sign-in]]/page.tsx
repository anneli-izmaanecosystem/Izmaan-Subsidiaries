import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-8">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-900">Izmaan Ecosystem</h1>
          <p className="mt-1 text-sm text-gray-500">Sign in to your account</p>
        </div>
        <SignIn />
      </div>
    </div>
  )
}
