import React, { useEffect, useState } from 'react';
import { apiClient } from '../core/api-client';
import { Card, Button, Input, Badge } from '@voicesphere/ui';
import { Wallet as WalletIcon, Coins, RefreshCw, Landmark } from 'lucide-react';

interface Transaction {
  id: string;
  type: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  createdAt: string;
  status: string;
}

export const Wallet: React.FC = () => {
  const [balance, setBalance] = useState<{ coinBalance: number; earningBalance: number } | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Recharge form
  const [rechargeAmount, setRechargeAmount] = useState<number>(1000); // 1000 cents = $10.00
  const [recharging, setRecharging] = useState(false);

  // Withdrawal form
  const [withdrawAmount, setWithdrawAmount] = useState<number>(1000); // min 1000 earnings
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER');
  const [paymentDetails, setPaymentDetails] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawSuccess, setWithdrawSuccess] = useState<string | null>(null);

  const fetchWallet = async () => {
    try {
      const balanceRes = await apiClient.get('/wallet');
      setBalance(balanceRes.data);

      const txRes = await apiClient.get('/wallet/transactions');
      setTransactions(txRes.data);
    } catch (err) {
      console.error('Error fetching wallet metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWallet();
  }, []);

  const handleRecharge = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecharging(true);
    try {
      const res = await apiClient.post('/payments/create-order', {
        amount: rechargeAmount,
        provider: 'STRIPE',
      });
      if (res.data.checkoutUrl) {
        // In development Mock mode, redirect user to our visual checkout screen in a new tab
        window.open(res.data.checkoutUrl, '_blank');
      } else {
        alert('Order initialized. Complete payment.');
      }
    } catch (err) {
      alert('Failed to initialize recharge checkout.');
    } finally {
      setRecharging(false);
    }
  };

  const handleWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentDetails) {
      alert('Please fill bank routing details');
      return;
    }
    setWithdrawing(true);
    setWithdrawSuccess(null);
    try {
      await apiClient.post('/withdrawals', {
        amount: withdrawAmount,
        paymentMethod,
        paymentDetails,
      });
      setWithdrawSuccess('Withdrawal request submitted for review!');
      setWithdrawAmount(1000);
      setPaymentDetails('');
      fetchWallet();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to request withdrawal.');
    } finally {
      setWithdrawing(false);
    }
  };

  const getTransactionBadge = (type: string) => {
    if (type === 'PURCHASE' || type === 'GIFT_RECEIVED') {
      return <Badge variant="success" className="text-[9px] px-1.5">{type.replace('_', ' ')}</Badge>;
    }
    return <Badge variant="danger" className="text-[9px] px-1.5">{type.replace('_', ' ')}</Badge>;
  };

  return (
    <div className="max-w-4xl w-full mx-auto px-4 py-8 flex flex-col gap-6">
      <div className="bg-slate-950/20 border-b border-slate-900 pb-5 text-left">
        <h2 className="text-xl font-black text-slate-200 flex items-center gap-2">
          <WalletIcon className="h-5 w-5 text-indigo-400" /> Virtual Wallet
        </h2>
        <p className="text-slate-500 text-xs mt-1">Recharge coin balances or transfer host earnings to banking portals.</p>
      </div>

      {loading ? (
        <div className="text-center text-slate-500 py-16 flex flex-col items-center gap-2">
          <RefreshCw className="h-6 w-6 animate-spin text-indigo-500" />
          <span className="text-xs">Loading wallet ledger...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Balance Card */}
          <div className="md:col-span-1 flex flex-col gap-6">
            <Card className="p-6 border-slate-900 bg-gradient-to-br from-indigo-950/40 to-slate-950/60 rounded-2xl flex flex-col justify-between h-[160px] text-left">
              <div>
                <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Recharge Balance</span>
                <div className="flex items-center gap-2 mt-2">
                  <Coins className="h-6 w-6 text-amber-500" />
                  <h3 className="text-3xl font-black text-slate-100">{balance?.coinBalance || 0}</h3>
                  <span className="text-[10px] text-slate-500 font-semibold">Coins</span>
                </div>
              </div>
              <span className="text-[9px] text-slate-500">Used for gifting roses/diamonds in voice rooms.</span>
            </Card>

            <Card className="p-6 border-slate-900 bg-gradient-to-br from-violet-950/40 to-slate-950/60 rounded-2xl flex flex-col justify-between h-[160px] text-left">
              <div>
                <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Host Earnings</span>
                <div className="flex items-center gap-2 mt-2">
                  <Landmark className="h-6 w-6 text-indigo-400" />
                  <h3 className="text-3xl font-black text-slate-100">{balance?.earningBalance || 0}</h3>
                  <span className="text-[10px] text-slate-500 font-semibold">Gifts</span>
                </div>
              </div>
              <span className="text-[9px] text-slate-500">Withdrawable cash balance ($1.00 per 100 earnings).</span>
            </Card>
          </div>

          {/* Recharge & Withdrawal Forms */}
          <div className="md:col-span-2 flex flex-col gap-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Recharge Form */}
              <Card className="p-5 border-slate-900 bg-slate-950/40 rounded-2xl text-left">
                <h4 className="font-extrabold text-xs text-slate-200 mb-4 flex items-center gap-1.5">
                  <Coins className="h-4.5 w-4.5 text-amber-500" /> Recharge Coins
                </h4>
                
                <form onSubmit={handleRecharge} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-slate-500 text-[10px] font-bold">Select Recharge Value</label>
                    <select
                      value={rechargeAmount}
                      onChange={(e) => setRechargeAmount(parseInt(e.target.value))}
                      className="bg-slate-950 border border-slate-800 text-xs rounded-xl p-2.5 text-slate-350 focus:outline-none"
                    >
                      <option value={500}>50 Coins ($5.00)</option>
                      <option value={1000}>100 Coins ($10.00)</option>
                      <option value={2500}>250 Coins ($25.00)</option>
                      <option value={5000}>500 Coins ($50.00)</option>
                    </select>
                  </div>

                  <Button variant="primary" type="submit" disabled={recharging} className="h-10 w-full rounded-xl font-bold text-xs">
                    {recharging ? 'Initializing...' : 'Buy Now'}
                  </Button>
                </form>
              </Card>

              {/* Withdrawal Form */}
              <Card className="p-5 border-slate-900 bg-slate-950/40 rounded-2xl text-left">
                <h4 className="font-extrabold text-xs text-slate-200 mb-4 flex items-center gap-1.5">
                  <Landmark className="h-4.5 w-4.5 text-indigo-400" /> Cash Out Earnings
                </h4>

                {withdrawSuccess && (
                  <div className="mb-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-2.5 rounded-xl text-[10px] text-center">
                    {withdrawSuccess}
                  </div>
                )}

                <form onSubmit={handleWithdrawal} className="flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Earnings Amount"
                      type="number"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(parseInt(e.target.value))}
                      min={1000}
                      required
                    />

                    <div className="flex flex-col gap-1">
                      <label className="text-slate-500 text-[10px] font-bold mb-1">Payout Method</label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="bg-slate-950 border border-slate-800 text-xs rounded-xl p-2.5 text-slate-350 focus:outline-none"
                      >
                        <option value="BANK_TRANSFER">Bank routing</option>
                        <option value="STRIPE">Stripe Connect</option>
                      </select>
                    </div>
                  </div>

                  <Input
                    label="Bank routing Routing / Account details"
                    placeholder="Routing: 12345, Account: 98765"
                    value={paymentDetails}
                    onChange={(e) => setPaymentDetails(e.target.value)}
                    required
                  />

                  <Button variant="primary" type="submit" disabled={withdrawing || (balance ? balance.earningBalance < withdrawAmount : true)} className="h-10 w-full rounded-xl font-bold text-xs bg-gradient-to-r from-violet-600 to-indigo-600">
                    {withdrawing ? 'Requesting...' : 'Request Payout'}
                  </Button>
                </form>
              </Card>
            </div>

            {/* Transactions History Table */}
            <Card className="p-5 border-slate-900 bg-slate-950/20 rounded-2xl text-left">
              <h4 className="font-extrabold text-xs text-slate-200 mb-4">Transaction Ledger</h4>
              
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs text-slate-300">
                  <thead className="border-b border-slate-950 text-slate-500">
                    <tr>
                      <th className="py-2.5 font-bold text-left">Date</th>
                      <th className="py-2.5 font-bold text-left">Transaction</th>
                      <th className="py-2.5 font-bold text-right">Ledger Value</th>
                      <th className="py-2.5 font-bold text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-950">
                    {transactions.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-slate-500">No recent transactions recorded</td>
                      </tr>
                    ) : (
                      transactions.map((tx) => (
                        <tr key={tx.id}>
                          <td className="py-3 text-slate-400">{new Date(tx.createdAt).toLocaleDateString()}</td>
                          <td className="py-3 font-semibold">{getTransactionBadge(tx.type)}</td>
                          <td className={`py-3 text-right font-bold ${tx.amount < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {tx.amount < 0 ? '' : '+'}{tx.amount}
                          </td>
                          <td className="py-3 text-right font-mono text-[10px] text-slate-500">{tx.status}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};
