import React, { useEffect, useMemo, useState } from 'https://esm.sh/react@18.2.0';
import { createRoot } from 'https://esm.sh/react-dom@18.2.0/client';
import { motion, AnimatePresence } from 'https://esm.sh/framer-motion@11.3.24?deps=react@18.2.0,react-dom@18.2.0';
import { RefreshCw, Zap, Landmark, CircleDollarSign, AlertTriangle } from 'https://esm.sh/lucide-react@0.441.0?deps=react@18.2.0';
import htm from 'https://esm.sh/htm@3.1.1';

const html = htm.bind(React.createElement);
const STORAGE_KEY = 'supply-demand-lab-state-v1';
const defaults = { step: 1, demandShift: 62, demandSlope: -0.75, supplyShift: 18, supplySlope: 0.62, shock: 'none', priceControlOffset: 0 };
const stepLabels = ['Step 1: The Single Curve', 'Step 2: The Market Intersection', 'Step 3: Market Shocks & Surplus', 'Step 4: Market Inefficiency'];
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const toFixedSafe = (v, d = 1) => (Number.isFinite(v) ? v.toFixed(d) : '—');

function safeIntersection(a1, b1, a2, b2) {
  const den = b1 - b2;
  if (Math.abs(den) < 1e-6) return { q: null, p: null, parallel: true };
  const q = (a2 - a1) / den;
  const p = a1 + b1 * q;
  if (!Number.isFinite(q) || !Number.isFinite(p)) return { q: null, p: null, parallel: true };
  return { q, p, parallel: false };
}

function Slider({ label, value, min, max, step = 1, onChange }) {
  return html`<label className="space-y-2 block">
    <div className="flex items-center justify-between text-sm text-slate-600"><span>${label}</span><span className="font-medium text-slate-800">${value}</span></div>
    <input className="slider-haptic w-full" type="range" min=${min} max=${max} step=${step} value=${value} onChange=${(e) => onChange(Number(e.target.value))} />
  </label>`;
}

function App() {
  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? { ...defaults, ...JSON.parse(raw) } : defaults;
    } catch { return defaults; }
  });
  useEffect(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(state)), [state]);

  const demand = { a: state.demandShift, b: state.demandSlope };
  const shockShift = state.shock === 'technology' ? -8 : state.shock === 'tax' ? 8 : 0;
  const supply = { a: state.supplyShift + shockShift, b: state.supplySlope };
  const intersection = useMemo(() => safeIntersection(demand.a, demand.b, supply.a, supply.b), [demand.a, demand.b, supply.a, supply.b]);

  const effectivePrice = state.step >= 4 && Number.isFinite(intersection.p) ? intersection.p + state.priceControlOffset : null;
  const priceControl = useMemo(() => {
    if (state.step < 4 || !Number.isFinite(effectivePrice)) return null;
    const qd = (effectivePrice - demand.a) / demand.b;
    const qs = (effectivePrice - supply.a) / supply.b;
    return { qd, qs, isFloor: state.priceControlOffset > 0, isCeiling: state.priceControlOffset < 0, binding: Math.abs(state.priceControlOffset) > 0.2 };
  }, [state.step, state.priceControlOffset, effectivePrice, demand.a, demand.b, supply.a, supply.b]);

  const graph = { w: 760, h: 480, margin: 52, qMax: 100, pMax: 100 };
  const toX = (q) => graph.margin + (q / graph.qMax) * (graph.w - graph.margin * 2);
  const toY = (p) => graph.h - graph.margin - (p / graph.pMax) * (graph.h - graph.margin * 2);
  const eqAtQ = (curve, q) => curve.a + curve.b * q;
  const linePath = (curve) => `M ${toX(0)} ${toY(clamp(eqAtQ(curve, 0), 0, graph.pMax))} L ${toX(graph.qMax)} ${toY(clamp(eqAtQ(curve, graph.qMax), 0, graph.pMax))}`;
  const eqVisible = state.step >= 2 && !intersection.parallel;

  const legend = useMemo(() => {
    if (state.step === 1) return { icon: CircleDollarSign, text: state.demandSlope > -0.45 ? 'Demand is becoming less elastic: quantity changes more strongly when price moves.' : 'Demand is becoming more inelastic; consumers keep buying even as prices increase.' };
    if (state.step === 2) return { icon: Landmark, text: eqVisible ? `Market clears at P* ${toFixedSafe(intersection.p)} and Q* ${toFixedSafe(intersection.q)}.` : 'Curves are close to parallel, so no stable single equilibrium is visible.' };
    if (state.step === 3) return { icon: state.shock === 'none' ? Landmark : Zap, text: state.shock === 'technology' ? 'Technology lowers production costs, shifting supply outward and increasing efficient trade.' : state.shock === 'tax' ? 'A tax lifts producer costs, shifting supply inward and reducing total welfare.' : 'No shock selected. Activate a shock to compare welfare changes in real time.' };
    return { icon: AlertTriangle, text: priceControl?.isFloor && priceControl?.binding ? 'A binding price floor creates unsold surplus and deadweight loss, shown as lost economic value.' : priceControl?.isCeiling && priceControl?.binding ? 'A binding price ceiling creates shortages and foregone trades near equilibrium.' : 'Control price is near equilibrium, so inefficiency is minimal.' };
  }, [state.step, state.demandSlope, eqVisible, intersection.p, intersection.q, state.shock, priceControl]);

  return html`<div className="min-h-screen p-4 md:p-8">
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">Supply & Demand Laboratory</h1>
        <div className="grid gap-2 md:grid-cols-4">
          ${stepLabels.map((label, idx) => html`<${motion.button} key=${label} whileHover=${{ y: -1.5 }} whileTap=${{ scale: 0.98 }} onClick=${() => setState((s) => ({ ...s, step: idx + 1 }))} className=${`rounded-2xl border px-4 py-3 text-left text-sm backdrop-blur-xl transition ${state.step === idx + 1 ? 'border-slate-900 bg-white/90 text-slate-900 shadow-glass' : 'border-slate-300/70 bg-white/55 text-slate-600 hover:bg-white/80'}`}>${label}</${motion.button}>`)}
        </div>
      </header>

      <main className="grid gap-6 lg:grid-cols-[340px_1fr_320px]">
        <section className="rounded-2xl border border-white/70 bg-white/55 p-5 shadow-glass backdrop-blur-xl">
          <h2 className="mb-4 text-lg font-semibold">Controls</h2>
          <div className="space-y-5">
            <${Slider} label="Consumer Desire (Demand Shift)" value=${state.demandShift} min=${20} max=${90} onChange=${(v) => setState((s) => ({ ...s, demandShift: v }))} />
            <${Slider} label="Price Sensitivity / Elasticity (Demand Slope)" value=${state.demandSlope} min=${-1.3} max=${-0.2} step=${0.01} onChange=${(v) => setState((s) => ({ ...s, demandSlope: v }))} />
            <${AnimatePresence}>${state.step >= 2 && html`<${motion.div} initial=${{ opacity: 0, height: 0 }} animate=${{ opacity: 1, height: 'auto' }} exit=${{ opacity: 0, height: 0 }} className="space-y-5"><${Slider} label="Production Cost (Supply Shift)" value=${state.supplyShift} min=${6} max=${55} onChange=${(v) => setState((s) => ({ ...s, supplyShift: v }))} /><${Slider} label="Producer Flexibility (Supply Slope)" value=${state.supplySlope} min=${0.15} max=${1.2} step=${0.01} onChange=${(v) => setState((s) => ({ ...s, supplySlope: v }))} /></${motion.div}>`}</${AnimatePresence}>
            <${AnimatePresence}>${state.step >= 3 && html`<${motion.label} initial=${{ opacity: 0, y: 6 }} animate=${{ opacity: 1, y: 0 }} exit=${{ opacity: 0, y: -4 }} className="block space-y-2"><span className="text-sm text-slate-600">Shock Scenario</span><select className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" value=${state.shock} onChange=${(e) => setState((s) => ({ ...s, shock: e.target.value }))}><option value="none">No Shock</option><option value="technology">Technology Breakthrough</option><option value="tax">New Tax</option></select></${motion.label}>`}</${AnimatePresence}>
            <${AnimatePresence}>${state.step >= 4 && html`<${motion.div} initial=${{ opacity: 0 }} animate=${{ opacity: 1 }} exit=${{ opacity: 0 }}><${Slider} label="Price Floor / Ceiling Offset" value=${state.priceControlOffset} min=${-22} max=${22} step=${0.5} onChange=${(v) => setState((s) => ({ ...s, priceControlOffset: v }))} /><p className="mt-2 text-xs text-slate-500">Negative = price ceiling, Positive = price floor</p></${motion.div}>`}</${AnimatePresence}>
          </div>
        </section>

        <section className="rounded-2xl border border-white/70 bg-white/65 p-4 shadow-glass backdrop-blur-xl">
          <svg viewBox=${`0 0 ${graph.w} ${graph.h}`} className="h-full min-h-[420px] w-full">
            <defs><pattern id="dwlHatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="8" stroke="#64748b" strokeWidth="2" /></pattern></defs>
            <line x1=${toX(0)} y1=${toY(0)} x2=${toX(graph.qMax)} y2=${toY(0)} stroke="#334155" strokeWidth="2" />
            <line x1=${toX(0)} y1=${toY(0)} x2=${toX(0)} y2=${toY(graph.pMax)} stroke="#334155" strokeWidth="2" />
            <text x=${toX(graph.qMax) - 8} y=${toY(0) + 28} fontSize="14" textAnchor="end" fill="#334155">Quantity (Q)</text>
            <text x=${toX(0) - 24} y=${toY(graph.pMax) + 12} fontSize="14" textAnchor="middle" fill="#334155">Price (P)</text>
            <${motion.path} d=${linePath(demand)} stroke="#0A84FF" strokeWidth="4" fill="none" initial=${false} animate=${{ d: linePath(demand) }} transition=${{ duration: 0.45 }} />
            <text x=${toX(66)} y=${toY(clamp(eqAtQ(demand, 66), 0, graph.pMax)) - 10} fill="#0A84FF" fontSize="14">Demand</text>
            ${state.step >= 2 && html`<><${motion.path} d=${linePath(supply)} stroke="#FF7A45" strokeWidth="4" fill="none" initial=${false} animate=${{ d: linePath(supply) }} transition=${{ duration: 0.45 }} /><text x=${toX(72)} y=${toY(clamp(eqAtQ(supply, 72), 0, graph.pMax)) + 18} fill="#FF7A45" fontSize="14">Supply</text></>`}
            ${eqVisible && html`<><line x1=${toX(intersection.q)} y1=${toY(0)} x2=${toX(intersection.q)} y2=${toY(intersection.p)} stroke="#64748b" strokeDasharray="6 6" /><line x1=${toX(0)} y1=${toY(intersection.p)} x2=${toX(intersection.q)} y2=${toY(intersection.p)} stroke="#64748b" strokeDasharray="6 6" /><${motion.circle} cx=${toX(intersection.q)} cy=${toY(intersection.p)} r="7" fill="#111827" animate=${{ scale: [1,1.25,1] }} transition=${{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }} /><text x=${toX(intersection.q)+10} y=${toY(intersection.p)-10} fontSize="13" fill="#111827">E(P*, Q*)</text></>`}
            ${state.step >= 3 && eqVisible && html`<><polygon points=${`${toX(0)},${toY(demand.a)} ${toX(0)},${toY(intersection.p)} ${toX(intersection.q)},${toY(intersection.p)}`} fill="rgba(10,132,255,0.15)" /><polygon points=${`${toX(0)},${toY(supply.a)} ${toX(0)},${toY(intersection.p)} ${toX(intersection.q)},${toY(intersection.p)}`} fill="rgba(255,122,69,0.2)" /></>`}
            ${state.step >= 4 && priceControl?.binding && Number.isFinite(effectivePrice) && html`<><line x1=${toX(0)} y1=${toY(effectivePrice)} x2=${toX(graph.qMax)} y2=${toY(effectivePrice)} stroke="#334155" strokeWidth="2.5" /><text x=${toX(graph.qMax)-8} y=${toY(effectivePrice)-6} fill="#334155" fontSize="12" textAnchor="end">${priceControl.isFloor ? 'Price Floor' : 'Price Ceiling'}</text>${priceControl.isFloor && priceControl.qs > priceControl.qd && html`<><line x1=${toX(priceControl.qd)} y1=${toY(0)} x2=${toX(priceControl.qd)} y2=${toY(effectivePrice)} stroke="#9CA3AF" strokeDasharray="4 5" /><line x1=${toX(priceControl.qs)} y1=${toY(0)} x2=${toX(priceControl.qs)} y2=${toY(effectivePrice)} stroke="#9CA3AF" strokeDasharray="4 5" /><text x=${(toX(priceControl.qd)+toX(priceControl.qs))/2} y=${toY(effectivePrice)-8} textAnchor="middle" fill="#6B7280" fontSize="12">Surplus Quantity</text><polygon points=${`${toX(priceControl.qd)},${toY(eqAtQ(demand, priceControl.qd))} ${toX(intersection.q)},${toY(intersection.p)} ${toX(priceControl.qd)},${toY(eqAtQ(supply, priceControl.qd))}`} fill="url(#dwlHatch)" opacity="0.5" /><text x=${toX(priceControl.qd)+8} y=${toY(intersection.p)-10} fill="#475569" fontSize="12">Lost Economic Value</text></>`}</>`}
          </svg>
        </section>

        <aside className="rounded-2xl border border-white/70 bg-white/55 p-5 shadow-glass backdrop-blur-xl">
          <h2 className="mb-4 text-lg font-semibold">Dynamic Legend</h2>
          <div className="flex items-start gap-3 rounded-2xl bg-white/70 p-4"><${legend.icon} className="mt-0.5 h-5 w-5 text-slate-700" /><p className="text-sm leading-relaxed text-slate-700">${legend.text}</p></div>
          <div className="mt-4 space-y-1 text-sm text-slate-600"><p>Current P*: <span className="font-medium text-slate-900">${toFixedSafe(intersection.p)}</span></p><p>Current Q*: <span className="font-medium text-slate-900">${toFixedSafe(intersection.q)}</span></p></div>
        </aside>
      </main>
    </div>

    <${motion.button} whileHover=${{ rotate: -30 }} whileTap=${{ scale: 0.94 }} onClick=${() => setState(defaults)} className="fixed bottom-6 right-6 rounded-full bg-slate-900 p-4 text-white shadow-2xl" aria-label="Reset simulation"><${RefreshCw} className="h-5 w-5" /></${motion.button}>
  </div>`;
}

createRoot(document.getElementById('root')).render(html`<${App} />`);
