import { WalletBalances } from "@/components/WalletBalances";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <main className="py-8">
        <WalletBalances />
      </main>
    </div>
  );
}
