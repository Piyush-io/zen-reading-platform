"use client"

import * as Clerk from "@clerk/elements/common"
import * as SignUp from "@clerk/elements/sign-up"

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <SignUp.Root>
        <SignUp.Step
          name="start"
          className="w-full max-w-md space-y-8 py-10"
        >
          <header className="text-center">
            <h1 className="text-3xl font-light tracking-wider mb-2">Serene</h1>
            <p className="text-sm text-muted-foreground font-light">
              Create your reading sanctuary
            </p>
          </header>

          <Clerk.GlobalError className="block text-sm text-red-500 text-center font-light" />

          <div className="space-y-6">
            <Clerk.Field name="emailAddress">
              <Clerk.Label className="sr-only">Email</Clerk.Label>
              <Clerk.Input
                type="email"
                required
                placeholder="email"
                className="w-full border-b border-border bg-transparent pb-2 text-sm font-light text-foreground outline-none placeholder:text-muted-foreground hover:border-foreground/40 focus:border-foreground transition-colors"
              />
              <Clerk.FieldError className="mt-2 block text-xs text-red-500 font-light" />
            </Clerk.Field>

            <SignUp.Action
              submit
              className="w-full border-b border-foreground pb-2 text-sm font-light text-foreground hover:text-muted-foreground transition-colors text-left"
            >
              continue
            </SignUp.Action>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/40" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-background px-2 text-muted-foreground font-light">or</span>
              </div>
            </div>

            <Clerk.Connection
              name="google"
              className="flex w-full items-center justify-center gap-3 border-b border-border pb-2 text-sm font-light text-foreground hover:border-foreground/40 hover:text-muted-foreground transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 17 16" className="w-4" aria-hidden>
                <path fill="currentColor" d="M8.82 7.28v2.187h5.227c-.16 1.226-.57 2.124-1.192 2.755-.764.765-1.955 1.6-4.035 1.6-3.218 0-5.733-2.595-5.733-5.813 0-3.218 2.515-5.814 5.733-5.814 1.733 0 3.005.685 3.938 1.565l1.538-1.538C12.998.96 11.256 0 8.82 0 4.41 0 .705 3.591.705 8s3.706 8 8.115 8c2.382 0 4.178-.782 5.582-2.24 1.44-1.44 1.893-3.475 1.893-5.111 0-.507-.035-.978-.115-1.369H8.82Z" />
              </svg>
              continue with google
            </Clerk.Connection>
          </div>

          <p className="text-center text-sm text-muted-foreground font-light">
            already have an account?{" "}
            <Clerk.Link
              navigate="sign-in"
              className="text-foreground hover:text-muted-foreground transition-colors"
            >
              sign in
            </Clerk.Link>
          </p>
        </SignUp.Step>

        <SignUp.Step
          name="verifications"
          className="w-full max-w-md space-y-8 py-10"
        >
          <SignUp.Strategy name="email_code">
            <header className="text-center">
              <h1 className="text-3xl font-light tracking-wider mb-2">Serene</h1>
              <p className="text-sm text-muted-foreground font-light">
                verify your email
              </p>
            </header>

            <Clerk.GlobalError className="block text-sm text-red-500 text-center font-light" />

            <Clerk.Field name="code">
              <Clerk.Label className="sr-only">Email code</Clerk.Label>
              <Clerk.Input
                type="otp"
                required
                placeholder="email code"
                className="w-full border-b border-border bg-transparent pb-2 text-sm font-light text-foreground outline-none placeholder:text-muted-foreground hover:border-foreground/40 focus:border-foreground transition-colors"
              />
              <Clerk.FieldError className="mt-2 block text-xs text-red-500 font-light" />
            </Clerk.Field>

            <SignUp.Action
              submit
              className="w-full border-b border-foreground pb-2 text-sm font-light text-foreground hover:text-muted-foreground transition-colors text-left"
            >
              verify
            </SignUp.Action>
          </SignUp.Strategy>

          <p className="text-center text-sm text-muted-foreground font-light">
            already have an account?{" "}
            <Clerk.Link
              navigate="sign-in"
              className="text-foreground hover:text-muted-foreground transition-colors"
            >
              sign in
            </Clerk.Link>
          </p>
        </SignUp.Step>

        <SignUp.Step
          name="continue"
          className="w-full max-w-md space-y-8 py-10"
        >
          <header className="text-center">
            <h1 className="text-3xl font-light tracking-wider mb-2">Serene</h1>
            <p className="text-sm text-muted-foreground font-light">
              complete your profile
            </p>
          </header>

          <Clerk.GlobalError className="block text-sm text-red-500 text-center font-light" />

          <div className="space-y-6">
            <Clerk.Field name="username">
              <Clerk.Label className="sr-only">Username</Clerk.Label>
              <Clerk.Input
                type="text"
                placeholder="username (optional)"
                className="w-full border-b border-border bg-transparent pb-2 text-sm font-light text-foreground outline-none placeholder:text-muted-foreground hover:border-foreground/40 focus:border-foreground transition-colors"
              />
              <Clerk.FieldError className="mt-2 block text-xs text-red-500 font-light" />
            </Clerk.Field>

            <SignUp.Action
              submit
              className="w-full border-b border-foreground pb-2 text-sm font-light text-foreground hover:text-muted-foreground transition-colors text-left"
            >
              continue
            </SignUp.Action>
          </div>
        </SignUp.Step>
      </SignUp.Root>
    </div>
  )
}
