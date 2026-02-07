import AccountsClient from './AccountsClient'

// This is the server component wrapper
// But we actually made the Client Component do the fetching via API for "live" filtering without reload complexity of Server Actions + SearchParams in this specific request context.
// Ideally, we fetch here and pass data. 
// But the user wants "popup" flow which matches Client SPA style. 
// Let's just render the Client Component.

export default function AccountsPage() {
    return <AccountsClient />
}
