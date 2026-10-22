import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ShoppingCart, ShieldCheck, Truck, CheckCircle, AlertTriangle, X, RefreshCw, Copy, ExternalLink } from 'lucide-react';

export default function SynthesisOrderModal({ isOpen, onClose, initialSequences = [] }) {
  const [vendor, setVendor] = useState('IDT'); // 'IDT' | 'Twist' | 'GenScript'
  const [scale, setScale] = useState('25nmol');
  const [purification, setPurification] = useState('Standard Desalting');
  const [sequences, setSequences] = useState(initialSequences);
  
  const [quoteData, setQuoteData] = useState(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState('');
  
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(null);
  const [copiedTracking, setCopiedTracking] = useState(false);

  const [shippingAddress, setShippingAddress] = useState({
    institution: 'Stanford University School of Medicine',
    recipient: 'Dr. Research Investigator',
    street: '291 Campus Drive, Beckman Center B300',
    city: 'Stanford',
    state: 'CA',
    zip: '94305',
    country: 'United States'
  });
  const [isEditingAddress, setIsEditingAddress] = useState(false);

  useEffect(() => {
    if (initialSequences && initialSequences.length > 0) {
      setSequences(initialSequences);
    }
  }, [initialSequences]);

  useEffect(() => {
    if (isOpen && sequences.length > 0) {
      fetchQuote();
    }
  }, [isOpen, vendor, scale, purification, sequences]);

  const fetchQuote = async () => {
    setQuoteLoading(true);
    setQuoteError('');
    try {
      const items = sequences.map(s => ({
        name: s.name || 'Oligo',
        sequence: s.sequence,
        scale: scale,
        purification: purification
      }));
      const res = await api.getSynthesisQuote({
        sequences: items,
        preferred_vendor: vendor
      });
      if (res.status === 'biosecurity_rejection') {
        setQuoteError(res.message);
        setQuoteData(null);
      } else {
        setQuoteData(res.quotes ? res.quotes[vendor] : null);
      }
    } catch (err) {
      setQuoteError(err.message || 'Failed to fetch quote');
      setQuoteData(null);
    } finally {
      setQuoteLoading(false);
    }
  };

  const handlePlaceOrder = async () => {
    setOrderLoading(true);
    setQuoteError('');
    try {
      const items = sequences.map(s => ({
        name: s.name || 'Oligo',
        sequence: s.sequence,
        scale: scale,
        purification: purification
      }));
      const res = await api.placeSynthesisOrder({
        vendor: vendor,
        sequences: items,
        shipping_address: shippingAddress,
        user_id: 'INVESTIGATOR_LAB_01'
      });
      if (res.status === 'success') {
        setOrderSuccess(res.order);
      } else {
        setQuoteError(res.message || 'Order placement failed');
      }
    } catch (err) {
      setQuoteError(err.message || 'Order transmission failed');
    } finally {
      setOrderLoading(false);
    }
  };

  const copyTracking = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedTracking(true);
    setTimeout(() => setCopiedTracking(false), 3000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col text-slate-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-white">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Automated Synthesis Checkout
                <span className="text-[10px] bg-emerald-950 border border-emerald-800 text-emerald-300 px-2 py-0.5 rounded font-mono font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" /> DURC SCREENED
                </span>
              </h2>
              <p className="text-xs text-slate-400">Direct B2B procurement with synthesis partners</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {orderSuccess ? (
            /* Order Placed Confirmation View */
            <div className="bg-emerald-950/40 border border-emerald-700/80 rounded-xl p-6 text-center space-y-4">
              <div className="w-12 h-12 bg-emerald-600 rounded-full flex items-center justify-center mx-auto text-white shadow-lg shadow-emerald-600/30">
                <CheckCircle className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-emerald-300">Order Confirmed &amp; Transmitted</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Your oligonucleotide construct order has been transmitted directly to the <strong>{orderSuccess.vendor}</strong> synthesis facility.
                </p>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs font-mono text-left space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Order ID:</span>
                  <span className="font-bold text-white">{orderSuccess.order_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status:</span>
                  <span className="text-cyan-400 font-bold">{orderSuccess.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Carrier:</span>
                  <span className="text-slate-300">{orderSuccess.carrier}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Tracking Number:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-purple-300 font-bold">{orderSuccess.tracking_number}</span>
                    <button
                      onClick={() => copyTracking(orderSuccess.tracking_number)}
                      className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
                      title="Copy Tracking"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Estimated Delivery:</span>
                  <span className="text-emerald-400 font-bold">{orderSuccess.estimated_delivery}</span>
                </div>
                <div className="flex justify-between border-t border-slate-800 pt-2 text-sm font-sans font-bold">
                  <span className="text-slate-300">Total Billed:</span>
                  <span className="text-emerald-300">${orderSuccess.total_price_usd.toFixed(2)} USD</span>
                </div>
              </div>

              <div className="pt-2 flex justify-center gap-3">
                <button
                  onClick={onClose}
                  className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition-all"
                >
                  Close Window
                </button>
              </div>
            </div>
          ) : (
            /* Order Config & Quote View */
            <>
              {/* Sequence Summary */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  <span>Construct Items to Synthesize ({sequences.length})</span>
                  <span className="text-cyan-400 font-mono">
                    {sequences.reduce((acc, s) => acc + (s.sequence?.length || 0), 0)} total nt
                  </span>
                </div>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {sequences.map((s, idx) => (
                    <div key={idx} className="bg-slate-900 p-2 rounded-lg text-xs font-mono flex items-center justify-between border border-slate-800/80 gap-2">
                      <span className="text-white font-semibold shrink-0">{s.name || `Oligo_${idx+1}`}</span>
                      <span className="text-slate-400 shrink-0">{s.sequence?.length || 0} nt</span>
                      <span className="text-emerald-400 truncate flex-1">{s.sequence}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => navigator.clipboard.writeText(s.sequence)}
                          title="Copy sequence"
                          className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        {sequences.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setSequences(sequences.filter((_, i) => i !== idx))}
                            title="Remove oligo"
                            className="p-1 hover:bg-rose-950/80 text-slate-500 hover:text-rose-400 rounded"
                          >
                            &times;
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Vendor Selector Cards */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                  Select Synthesis Partner:
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'IDT', name: 'IDT (Integrated DNA)', lead: '3-5 business days', desc: 'Standard for sgRNAs & Alt-R oligos' },
                    { id: 'Twist', name: 'Twist Bioscience', lead: '5-7 business days', desc: 'High-throughput oligo pools & long genes' },
                    { id: 'GenScript', name: 'GenScript', lead: '7-10 business days', desc: 'Scale up to 10mg & clonal vectors' }
                  ].map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setVendor(v.id)}
                      className={`p-3.5 rounded-xl border text-left transition-all ${
                        vendor === v.id
                          ? 'bg-blue-950/60 border-blue-500 shadow-md ring-1 ring-blue-500/50'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-bold text-sm text-white">{v.name}</div>
                      <div className="text-[11px] text-cyan-400 font-mono mt-0.5">{v.lead}</div>
                      <div className="text-[10px] text-slate-400 mt-1 line-clamp-2">{v.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Scale & Purification Controls */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1.5 uppercase">Synthesis Scale:</label>
                  <select
                    value={scale}
                    onChange={(e) => setScale(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg p-2.5 font-medium focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="25nmol">25 nmol (Standard Discovery)</option>
                    <option value="100nmol">100 nmol (Extended Screening)</option>
                    <option value="1umol">1 µmol (In-Vivo Preclinical)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1.5 uppercase">Purification Grade:</label>
                  <select
                    value={purification}
                    onChange={(e) => setPurification(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg p-2.5 font-medium focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="Standard Desalting">Standard Desalting (Free)</option>
                    <option value="PAGE">PAGE Purification (+ Yield Check)</option>
                    <option value="HPLC">HPLC High-Purity (&gt;95%)</option>
                  </select>
                </div>
              </div>

              {/* Live Quote Display */}
              <div className="bg-[#070b14] p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-cyan-400" /> Live Partner Quote: {vendor}
                  </span>
                  {quoteLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />}
                </div>

                {quoteError ? (
                  <div className="p-3 bg-rose-950/60 border border-rose-800 text-rose-300 rounded-lg text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" /> {quoteError}
                  </div>
                ) : quoteData ? (
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>Items Subtotal:</span>
                      <span className="font-mono text-slate-200">${quoteData.items_subtotal_usd?.toFixed(2)} USD</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Estimated Shipping &amp; Cold-Pack:</span>
                      <span className="font-mono text-slate-200">${quoteData.shipping_usd?.toFixed(2)} USD</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Estimated Turnaround:</span>
                      <span className="font-mono text-cyan-300">{quoteData.estimated_turnaround}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-800 pt-2 text-sm font-bold text-white">
                      <span>Total Estimated Price:</span>
                      <span className="text-emerald-400 font-mono">${quoteData.total_price_usd?.toFixed(2)} USD</span>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Shipping Address Accordion */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs text-slate-400 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-300">Delivery Destination:</span>
                  <button
                    type="button"
                    onClick={() => setIsEditingAddress(!isEditingAddress)}
                    className="text-cyan-400 hover:text-cyan-300 text-[11px] font-semibold"
                  >
                    {isEditingAddress ? 'Done' : 'Edit Address'}
                  </button>
                </div>
                {isEditingAddress ? (
                  <div className="grid grid-cols-2 gap-2 pt-1 font-mono">
                    <input
                      type="text"
                      placeholder="Recipient"
                      value={shippingAddress.recipient}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, recipient: e.target.value })}
                      className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Institution"
                      value={shippingAddress.institution}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, institution: e.target.value })}
                      className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Street Address"
                      value={shippingAddress.street}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, street: e.target.value })}
                      className="col-span-2 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs"
                    />
                    <input
                      type="text"
                      placeholder="City"
                      value={shippingAddress.city}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })}
                      className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs"
                    />
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="State"
                        value={shippingAddress.state}
                        onChange={(e) => setShippingAddress({ ...shippingAddress, state: e.target.value })}
                        className="w-1/2 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs"
                      />
                      <input
                        type="text"
                        placeholder="ZIP"
                        value={shippingAddress.zip}
                        onChange={(e) => setShippingAddress({ ...shippingAddress, zip: e.target.value })}
                        className="w-1/2 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="text-slate-200 font-medium">{shippingAddress.institution} &bull; {shippingAddress.recipient}</div>
                    <div className="text-slate-400 text-[11px]">{shippingAddress.street}, {shippingAddress.city}, {shippingAddress.state} {shippingAddress.zip}</div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handlePlaceOrder}
                  disabled={orderLoading || quoteLoading || !!quoteError || !quoteData}
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-lg text-xs font-bold transition-all shadow-lg shadow-cyan-600/20 disabled:opacity-50 flex items-center gap-2"
                >
                  {orderLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
                  <span>Place Order with {vendor}</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
