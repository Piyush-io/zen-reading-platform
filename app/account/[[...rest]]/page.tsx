"use client"

import { UserProfile } from "@clerk/nextjs"
import { Navigation } from "@/components/navigation"

export default function AccountPage() {
  return (
    <main className="min-h-screen">
      <Navigation />
      <div className="pt-32 pb-32 px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <header className="mb-16">
            <h1 className="text-5xl font-light tracking-tight mb-3">Account</h1>
            <p className="text-muted-foreground font-light text-base">
              Manage your profile, email, password, and security settings
            </p>
          </header>

          <UserProfile
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "bg-background border-none shadow-none rounded-2xl p-0 overflow-hidden",
                navbar: "bg-background border-r border-border rounded-none px-6 py-8 min-w-[240px]",
                navbarButton: "text-muted-foreground hover:text-foreground hover:bg-foreground/5 rounded-xl px-4 py-3 font-light transition-all duration-200",
                navbarButtonActive: "text-foreground bg-foreground/5 rounded-xl px-4 py-3 font-light",
                navbarMobileMenuButton: "text-foreground bg-background",
                navbarMobileMenuRow: "hover:bg-foreground/5 text-muted-foreground hover:text-foreground transition-colors",
                pageScrollBox: "p-12 bg-background",
                page: "bg-background",
                
                profileSection: "rounded-2xl p-8 border border-border mb-8 transition-all duration-300",
                profileSectionPrimaryButton: "bg-foreground text-background hover:bg-foreground/90 font-light rounded-xl px-6 py-2.5 transition-all duration-200",
                profileSectionTitleText: "text-xl font-light tracking-tight mb-1",
                profileSectionTitle: "mb-6 pb-4",
                profileSectionContent: "space-y-6 mt-6",
                
                accordionTriggerButton: "hover:bg-foreground/5 rounded-xl py-3 px-4 transition-all duration-200",
                accordionContent: "text-muted-foreground pt-4",
                
                formFieldRow: "space-y-2",
                formFieldLabel: "text-sm font-light text-muted-foreground mb-2.5 tracking-wide uppercase text-xs",
                formFieldInput: "bg-background border border-border rounded-xl px-4 py-3 text-sm font-light focus:ring-2 focus:ring-foreground/20 placeholder:text-muted-foreground/50 transition-all duration-200",
                formFieldInputShowPasswordButton: "text-muted-foreground hover:text-foreground transition-colors",
                formButtonPrimary: "bg-foreground text-background hover:bg-foreground/90 font-light rounded-xl px-6 py-2.5 transition-all duration-200",
                formButtonReset: "text-muted-foreground hover:text-foreground font-light transition-colors",
                
                badge: "bg-foreground/5 text-foreground font-light text-xs rounded-full px-3 py-1",
                
                identityPreview: "rounded-xl p-5 border border-border hover:bg-foreground/5 transition-all duration-200",
                identityPreviewText: "font-light",
                identityPreviewEditButton: "hover:text-foreground font-light text-sm hover:bg-foreground/5 rounded-lg px-3 py-1.5 transition-all",
                identityPreviewEditButtonIcon: "text-muted-foreground",
                
                profileSection__danger: "border-border",
                profileSection__activeDevices: "border-border",
                profileSection__connectedAccounts: "border-border",
                profileSection__emailAddresses: "border-border",
                profileSection__phoneNumbers: "border-border",
                profileSection__username: "border-border",
                profileSection__profile: "border-border",
                profileSection__password: "border-border",
                profileSection__mfa: "border-border",
                
                avatarBox: "w-24 h-24 border border-border bg-background transition-all duration-200",
                avatarImage: "opacity-100 rounded-full",
                avatarImageActions: "mt-4 space-x-3",
                avatarImageActionsUpload: "hover:text-foreground font-light text-sm hover:bg-foreground/5 rounded-lg px-4 py-2 transition-all",
                avatarImageActionsRemove: "text-red-500 hover:text-red-600 font-light text-sm hover:bg-red-50 rounded-lg px-4 py-2 transition-all",
                
                headerTitle: "text-3xl font-light tracking-tight mb-2",
                headerSubtitle: "text-sm text-muted-foreground font-light",
                
                dividerLine: "bg-border",
                dividerText: "text-muted-foreground font-light text-xs uppercase tracking-wider",
                
                modalContent: "bg-background border border-border rounded-2xl",
                modalCloseButton: "text-muted-foreground hover:text-foreground hover:bg-foreground/5 rounded-full transition-all",
                modalBackdrop: "bg-black/20 backdrop-blur-sm",
                
                breadcrumbs: "text-muted-foreground font-light text-sm",
                breadcrumbsItem: "hover:text-foreground transition-colors",
                breadcrumbsItemDivider: "text-border",
                
                fileDropAreaBox: "rounded-2xl border border-border hover:bg-foreground/5 transition-all duration-300 p-8",
                fileDropAreaIconBox: "text-muted-foreground mb-3",
                fileDropAreaText: "font-light text-muted-foreground mb-2",
                fileDropAreaHint: "text-xs text-muted-foreground/70",
                fileDropAreaButtonPrimary: "bg-foreground text-background hover:bg-foreground/90 font-light rounded-xl px-6 py-2.5 transition-all duration-200 mt-4",
                
                tableHead: "bg-foreground/5",
                tableBody: "",
                tableRow: "hover:bg-foreground/5 transition-colors",
                tableCell: "font-light py-4 px-4",
                
                menuList: "bg-background border border-border rounded-xl p-2",
                menuItem: "hover:bg-foreground/5 font-light rounded-lg px-3 py-2 transition-all duration-200",
                menuButton: "hover:bg-foreground/5 font-light rounded-lg px-3 py-2 transition-all duration-200",
                
                otpCodeFieldInput: "bg-background border border-border rounded-xl font-mono text-center text-2xl h-14 w-12 focus:ring-2 focus:ring-foreground/20 transition-all",
                formResendCodeLink: "hover:text-foreground font-light text-sm hover:underline transition-all",
                
                alert: "rounded-xl border border-border p-4",
                alertText: "font-light text-sm leading-relaxed",
                
                form: "space-y-6",
                formFieldAction: "text-muted-foreground hover:text-foreground font-light text-sm transition-colors",
                
                footer: "hidden",
                footerAction: "hidden",
              },
              variables: {
                colorPrimary: "hsl(var(--foreground))",
                colorDanger: "#ef4444",
                colorSuccess: "#22c55e",
                colorWarning: "#f59e0b",
                colorNeutral: "hsl(var(--muted-foreground))",
                colorTextOnPrimaryBackground: "hsl(var(--background))",
                colorText: "hsl(var(--foreground))",
                colorTextSecondary: "hsl(var(--muted-foreground))",
                colorBackground: "hsl(var(--background))",
                colorInputBackground: "hsl(var(--background))",
                colorInputText: "hsl(var(--foreground))",
                borderRadius: "1rem",
                fontFamily: "var(--font-sans)",
                fontSize: "0.875rem",
                fontWeight: "300",
                spacingUnit: "1rem",
              },
            }}
            routing="path"
            path="/account"
          />
        </div>
      </div>
    </main>
  )
}
