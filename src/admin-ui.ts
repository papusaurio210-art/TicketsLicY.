export const adminIcon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#087f78"/><path d="M19 12h26v40l-6-4-7 4-7-4-6 4z" fill="white"/><path d="m25 30 5 5 10-12" fill="none" stroke="#087f78" stroke-width="4"/></svg>';

export const adminHtml = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>TicketsLicY · Administración</title><link rel="icon" type="image/svg+xml" href="/admin/icon.svg"><link rel="stylesheet" href="/admin/style.css"><script defer src="/admin/app.js"></script></head><body><div id="app"><p>Cargando el panel…</p></div><div id="notice" role="status" aria-live="polite"></div></body></html>`;

export const adminCss = String.raw`@font-face{font-family:Instrument Sans;src:url('/admin/font.woff2') format('woff2');font-style:normal;font-weight:400 700;font-display:swap}
:root{font-family:'Instrument Sans',system-ui,-apple-system,'Segoe UI',sans-serif;color:#0f1b2a;background:#f3f5f4;font-size:15px;line-height:1.5;--navy:#0e1f33;--navy-light:#1a3654;--accent:#0b6e6a;--accent-hover:#08524f;--accent-soft:#e2f0ee;--surface:#fff;--line:#d9e1df;--muted:#4f5d68;--red:#b42318;--red-soft:#fdecea;--amber:#6e4300;--mono:ui-monospace,SFMono-Regular,Consolas,monospace}
*{box-sizing:border-box}body{margin:0}button,input,select{font:inherit}button,a,input,select{ -webkit-tap-highlight-color:transparent}button{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:44px;cursor:pointer;border:1px solid transparent;border-radius:9px;padding:10px 17px;background:var(--accent);color:white;font-weight:600;font-size:14px;line-height:1.4;transition:background .15s,border-color .15s,box-shadow .15s}button:hover{background:var(--accent-hover)}button:disabled{opacity:.48;cursor:wait}button.secondary{background:white;border-color:#bfcfcb;color:#1c3542}button.secondary:hover{background:#f0f5f3;border-color:#8eafaa}button.danger{background:var(--red);color:white}button.danger:hover{background:#8f1c13}button.danger-outline{background:white;border-color:#efb7b0;color:var(--red)}button.danger-outline:hover{background:var(--red-soft)}button:focus-visible,a:focus-visible,input:focus-visible,select:focus-visible{outline:3px solid #63b5ac;outline-offset:3px}.ui-icon{width:20px;height:20px;flex-shrink:0;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}input,select{width:100%;min-width:0;min-height:46px;background:white;border:1px solid #bccbc8;border-radius:9px;padding:11px 13px;color:#142b3b;transition:border-color .15s,box-shadow .15s}input::placeholder{color:#73817f}input:focus,select:focus{border-color:var(--accent);box-shadow:0 0 0 3px #0b6e6a12}input[type=file]{padding:14px;border:1px dashed #a4bbb6;background:#f6faf9;cursor:pointer}input[type=file]::file-selector-button{background:var(--accent-soft);color:var(--accent);border:0;padding:9px 12px;border-radius:6px;margin-right:12px;font:inherit;font-weight:600}label{display:block;margin:0 0 7px;font-size:13px;font-weight:650}h1,h2,p{margin-top:0}h1{font-size:30px;line-height:1.18;font-weight:700;letter-spacing:-.04em;margin-bottom:9px}h2{font-size:18px;line-height:1.35;font-weight:650;letter-spacing:-.02em;margin-bottom:16px}p{line-height:1.65;margin-bottom:16px}small,.muted{color:var(--muted);font-size:13px}.shell{display:grid;grid-template-columns:248px minmax(0,1fr);min-height:100vh}.sidebar{position:sticky;top:0;height:100dvh;background:var(--navy);color:#d2dee8;padding:24px 14px 18px;display:flex;flex-direction:column;overflow-y:auto}.brand{display:flex;align-items:center;gap:11px;padding:0 10px}.brand-mark{display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:10px;background:var(--accent);color:#fff;flex-shrink:0}.brand strong{font-size:19px;letter-spacing:-.04em;color:white}.sidebar-caption{display:block;padding:12px 10px 0;color:#8fa3b8;font-size:12px}.sidebar nav{display:flex;flex-direction:column;gap:5px;margin-top:32px;flex:1}.sidebar nav button{justify-content:flex-start;width:100%;min-height:46px;text-align:left;padding:11px 13px;background:transparent;color:#c9d6e2;font-weight:500}.sidebar nav button:hover{background:#ffffff09;color:#fff}.sidebar nav button.selected{background:var(--navy-light);color:#fff;font-weight:600}.sidebar nav button.selected .ui-icon{color:#68c8bd}.sidebar nav button:last-child{margin-top:auto}.sidebar-user{display:flex;align-items:center;gap:11px;padding:18px 9px 0;margin-top:24px;border-top:1px solid #284056}.avatar{display:inline-flex;align-items:center;justify-content:center;width:35px;height:35px;flex-shrink:0;background:#294865;color:#e1eff7;border-radius:50%;font-size:12px;font-weight:650;letter-spacing:.02em}.sidebar-user strong{display:block;font-size:13px;color:#fff;overflow-wrap:anywhere}.sidebar-user small{color:#8fa3b8;font-size:11px}main{padding:34px 40px 48px;min-width:0;width:100%;max-width:1560px;margin-inline:auto}.top{display:flex;justify-content:space-between;align-items:center;gap:20px;margin-bottom:30px}.top small{font-size:13px}.top button{flex-shrink:0}.card{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:24px;margin:20px 0}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:18px;margin:0 0 24px}.grid .card{margin:0;min-height:143px;position:relative;overflow:hidden}.grid .card small{display:block;font-size:13px;font-weight:550;max-width:85%}.stat{font-family:var(--mono);font-size:32px;font-weight:600;letter-spacing:-.06em;margin-top:20px;line-height:1.1;font-variant-numeric:tabular-nums}.stat-icon{position:absolute;right:20px;top:20px;color:var(--accent);background:#f0f7f5;border:1px solid #dcece8;display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:9px}.stat-icon .ui-icon{width:17px;height:17px}.actions{display:flex;align-items:center;flex-wrap:wrap;gap:10px;margin-top:20px;grid-column:1/-1}.form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px 22px}form:not(.form-grid){display:grid;gap:14px}.form-field{min-width:0}.scroll{overflow:auto;background:white;border:1px solid var(--line);border-radius:14px;margin-top:20px}table{border-collapse:separate;border-spacing:0;width:100%;font-size:13px}th,td{padding:17px 16px;text-align:left;border-bottom:1px solid #e9eeed;vertical-align:middle}th{background:#f8faf9;color:#52656d;font-size:12px;font-weight:600;white-space:nowrap}td{color:#1d3040}tbody tr:last-child td{border-bottom:0}tbody tr:hover{background:#f5faf8}.numeric{font-family:var(--mono);font-size:12px;font-variant-numeric:tabular-nums}.cell-ticket{display:flex;align-items:center;gap:11px;min-width:135px;font-weight:600}.cell-ticket>.ui-icon{width:33px;height:39px;border:1px solid var(--line);padding:8px;border-radius:7px;color:#526b76;background:#f0f5f4;flex-shrink:0}td>div:not(.cell-ticket){display:flex;flex-wrap:wrap;gap:6px}td button{font-size:12px;padding:7px 10px;min-height:36px}td a{white-space:nowrap;font-weight:550}td .badge{white-space:nowrap}.badge{display:inline-flex;align-items:center;gap:6px;font-size:11px;line-height:1.4;font-weight:650;background:#e3f3e8;color:#17633a;padding:5px 9px;border-radius:6px}.badge::before{content:'';width:5px;height:5px;background:currentColor;border-radius:50%;flex-shrink:0}.badge.off,.badge.deleted{background:#fdecea;color:#b42318}.badge.review{background:#fff4d9;color:#6e4300}.badge.neutral{background:#ecefef;color:#4f5d68}.empty{padding:30px;color:var(--muted);font-size:14px;text-align:center}.warning{background:#fff8e9;border-color:#e6ca8b}.warning h2{color:var(--amber)}.warning p{color:#6c542b}.codes{font-family:var(--mono);font-size:12px;overflow-wrap:anywhere;background:#f2f7f5;border:1px solid var(--line);padding:18px;border-radius:10px}.codes p:last-child{margin-bottom:0}a{color:var(--accent);text-underline-offset:3px}#notice{position:fixed;bottom:24px;right:24px;max-width:min(440px,calc(100vw - 32px));background:var(--navy);color:white;padding:16px 20px;border-radius:11px;box-shadow:0 8px 32px #0e1f3326;display:none;z-index:50;font-size:14px;line-height:1.5}#notice.visible{display:block}.ticket-toolbar{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:14px;padding:20px;background:white;border:1px solid var(--line);border-radius:14px}.ticket-toolbar input{flex:1;min-width:220px;order:-1}.ticket-editor{border-top:3px solid var(--accent)}.editor-layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:24px}.editor-photo{background:#142a3f;border:1px solid #233e55;border-radius:11px;min-height:320px;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;padding:22px;gap:18px}.editor-photo img{display:block;max-width:100%;max-height:65vh;object-fit:contain;border-radius:3px}.editor-photo a,.editor-photo .muted{color:#d5e5ed;font-size:13px}.editor-photo>.ui-icon{width:62px;height:62px;color:#86aaa9}.editor-layout form{align-content:start}.editor-layout .actions{position:sticky;bottom:14px;background:white;padding:14px 0 0;border-top:1px solid var(--line)}.auth{max-width:none;padding:0;margin:0;min-height:100dvh;display:grid;grid-template-columns:minmax(340px,.9fr) minmax(420px,1.1fr)}.auth-brand{background:var(--navy);padding:48px max(36px,5vw);display:flex;flex-direction:column;justify-content:center;color:white;position:relative;overflow:hidden}.auth-brand::before{content:'';position:absolute;width:420px;height:420px;border:1px solid #40647435;border-radius:50%;right:-240px;bottom:-140px;box-shadow:0 0 0 65px #4064740a,0 0 0 130px #40647406}.auth-brand .brand{padding:0;margin-bottom:36px}.auth-brand h1{font-size:30px;color:white;margin:0}.auth-brand .brand-mark{width:42px;height:42px}.auth-brand>p{color:#c9d6e2;font-size:22px;line-height:1.55;letter-spacing:-.02em;max-width:360px}.auth-content{display:flex;align-items:center;justify-content:center;padding:42px 32px;background:#f8faf9}.auth .card{width:100%;max-width:460px;margin:0;padding:34px;border:1px solid var(--line);box-shadow:0 10px 40px #0e1f3305}.auth .card h2{font-size:25px;letter-spacing:-.035em;margin-bottom:26px}.auth .form-grid{grid-template-columns:1fr;gap:19px}.auth .actions button[type=submit]{width:100%;min-height:47px}.auth .card>button{margin-top:18px;width:100%;font-size:13px}.receipt-art{width:190px;min-height:240px;background:#fbfaf6;transform:rotate(-5deg);padding:28px 23px;box-shadow:0 16px 35px #0002;margin:26px auto 10px;border-radius:3px;clip-path:polygon(0 0,100% 0,100% 96%,95% 100%,90% 96%,85% 100%,80% 96%,75% 100%,70% 96%,65% 100%,60% 96%,55% 100%,50% 96%,45% 100%,40% 96%,35% 100%,30% 96%,25% 100%,20% 96%,15% 100%,10% 96%,5% 100%,0 96%)}.receipt-art .ui-icon{color:var(--accent);width:32px;height:32px;display:block;margin:0 auto 24px}.receipt-line{height:5px;background:#d1ddd8;margin-bottom:13px;border-radius:2px}.receipt-line.short{width:62%}.receipt-line.total{height:16px;margin-top:24px;background:#b5d6ce}.confirm-dialog{border:1px solid var(--line);border-radius:16px;padding:28px;width:min(440px,calc(100vw - 32px));color:var(--navy);box-shadow:0 20px 80px #0e1f3333}.confirm-dialog::backdrop{background:#0e1f336b;backdrop-filter:blur(3px)}.confirm-dialog h2{margin-bottom:14px}.confirm-dialog p{color:var(--muted)}.confirm-dialog .actions{justify-content:flex-end}
.auth-message{max-width:640px;margin:10vh auto;padding:32px}
@media(min-width:1500px){.auth-brand{padding-left:8vw;padding-right:8vw}}
@media(max-width:1100px) and (min-width:761px){.shell{grid-template-columns:220px minmax(0,1fr)}main{padding:30px 24px}.sidebar{padding-inline:10px}.editor-layout{grid-template-columns:1fr}.editor-photo{min-height:220px}.editor-photo img{max-height:360px}.form-grid{gap:18px}}
@media(max-width:760px){.shell{display:block}.sidebar{position:static;height:auto;padding:17px 20px;overflow:visible;display:block}.brand{padding:0}.brand strong{font-size:19px}.brand-mark{width:31px;height:31px}.sidebar-caption{display:none}.sidebar-user{display:none}.sidebar nav{position:fixed;inset:auto 0 0;z-index:30;margin:0;display:flex;flex-direction:row;align-items:stretch;gap:4px;overflow-x:auto;overscroll-behavior-x:contain;padding:8px 10px calc(8px + env(safe-area-inset-bottom));background:white;border-top:1px solid var(--line);scrollbar-width:none;box-shadow:0 -4px 18px #0e1f3306}.sidebar nav::-webkit-scrollbar{display:none}.sidebar nav button{flex:0 0 auto;min-width:75px;width:auto;min-height:59px;flex-direction:column;justify-content:center;gap:5px;color:#52656d;font-size:10px;padding:8px;border-radius:8px;white-space:nowrap}.sidebar nav button:last-child{margin-top:0}.sidebar nav button:hover{background:#f1f7f5;color:var(--accent)}.sidebar nav button.selected{background:var(--accent-soft);color:var(--accent)}.sidebar nav button.selected .ui-icon{color:var(--accent)}main{padding:24px 18px calc(110px + env(safe-area-inset-bottom))}.top{align-items:flex-start;gap:10px;margin-bottom:24px}.top h1{font-size:26px}.top small{font-size:12px}.top button{font-size:12px;padding:8px 10px;min-height:40px}.top button .ui-icon{width:16px;height:16px}.grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.grid .card{padding:18px 14px;min-height:132px}.grid .card small{font-size:12px;max-width:80%;min-height:36px}.grid .card:first-child{grid-column:1/-1}.grid .card:first-child .stat{font-size:33px}.stat{font-size:24px;overflow-wrap:anywhere;margin-top:12px}.stat-icon{width:27px;height:27px;right:12px;top:15px}.stat-icon .ui-icon{width:15px;height:15px}.card{padding:20px;margin:16px 0}.form-grid{grid-template-columns:1fr;gap:17px}.actions{gap:8px}.actions button{flex:1}.scroll{border:0;background:transparent;overflow:visible;margin-top:16px}table,tbody{display:block;width:100%}thead{display:none}tbody tr{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;background:white;border:1px solid var(--line);border-radius:13px;padding:18px;margin-bottom:12px}tbody tr:hover{background:white}td,tbody tr:last-child td{display:flex;flex-direction:column;align-items:flex-start;gap:6px;padding:0;border:0;min-width:0;overflow-wrap:anywhere;font-size:13px}td::before{content:attr(data-label);color:#61746f;font-family:'Instrument Sans',system-ui,sans-serif;font-size:11px;font-weight:550;letter-spacing:.01em}td[data-label=Comercio],td[data-label=Acciones],td[data-label=Responsable],td[data-label=Referencia]{grid-column:1/-1}td[data-label=Comercio]{order:-1}.cell-ticket{font-size:15px}.cell-ticket>.ui-icon{width:31px;height:36px}td button{min-height:42px;font-size:12px}td>div:not(.cell-ticket){gap:8px;width:100%}td>div:not(.cell-ticket)>button{flex:1}td[data-label=Acciones]{padding-top:12px;border-top:1px solid #e9eeed}td[data-label=Imagen] a{min-height:32px;display:inline-flex;align-items:center}.ticket-toolbar{padding:16px;gap:12px}.ticket-toolbar input{min-width:0;flex-basis:100%;order:-1}.ticket-toolbar button{width:100%}.editor-layout{grid-template-columns:1fr;gap:22px}.editor-photo{min-height:230px;padding:16px}.editor-photo img{max-height:380px}.editor-layout .actions{position:static}.editor-layout .actions button{min-width:110px}.auth{display:block;background:#f8faf9;padding-bottom:30px;min-height:100dvh}.auth-brand{padding:28px 24px 22px;background:transparent;color:var(--navy)}.auth-brand::before,.auth-brand .receipt-art{display:none}.auth-brand .brand{margin:0 0 16px}.auth-brand h1{color:var(--navy);font-size:25px}.auth-brand>p{font-size:16px;color:var(--muted);margin:0;max-width:none}.auth-brand .brand-mark{width:35px;height:35px}.auth-content{padding:0 18px 24px;display:block}.auth .card{max-width:none;padding:25px 21px}.auth .card h2{font-size:23px}.auth .actions button{width:100%}#notice{bottom:calc(96px + env(safe-area-inset-bottom));right:16px;font-size:13px}.auth-view #notice{bottom:20px}.confirm-dialog{padding:24px}.confirm-dialog .actions button{flex:1}}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{scroll-behavior:auto!important;transition:none!important;animation:none!important}}
.top-controls{display:flex;gap:10px;align-items:center;flex-wrap:wrap;justify-content:flex-end}.auth-content{position:relative}.auth-content>.theme-toggle{position:absolute;right:24px;top:20px}.image-link{padding:0;min-height:36px;background:transparent;color:var(--accent);text-decoration:underline;text-underline-offset:3px;font-weight:550}.image-link:hover{background:var(--accent-soft)}.editor-photo .image-link{color:#d5e5ed;padding:5px 12px}.image-viewer{position:fixed;inset:auto;margin:0;width:560px;height:650px;max-width:calc(100vw - 24px);max-height:calc(100dvh - 24px);padding:0;border:1px solid var(--line);border-radius:14px;background:var(--surface);color:inherit;box-shadow:0 18px 70px #0005;z-index:60;overflow:hidden;resize:both;min-width:280px;min-height:280px}.image-viewer[open]{display:flex;flex-direction:column}.viewer-header{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 16px;background:var(--surface);border-bottom:1px solid var(--line);cursor:move;touch-action:none;flex-shrink:0}.viewer-header strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.viewer-header button{min-height:36px;padding:6px 12px}.viewer-header:focus-visible{outline:3px solid #63b5ac;outline-offset:-3px}.viewer-tools{display:flex;align-items:center;justify-content:center;gap:10px;padding:10px;background:var(--surface);flex-shrink:0}.viewer-tools button{min-height:36px;padding:6px 13px}.viewer-percent{min-width:48px;text-align:center;font-variant-numeric:tabular-nums}.viewer-stage{position:relative;flex:1;min-height:0;background:#142a3f;overflow:hidden;display:flex;align-items:center;justify-content:center;touch-action:none;cursor:grab}.viewer-stage:active{cursor:grabbing}.viewer-stage img{width:100%;height:100%;object-fit:contain;user-select:none;padding:14px;transform-origin:center}.viewer-status{position:absolute;padding:20px;color:#e4edf4;text-align:center;max-width:90%}
:root[data-theme=dark]{color-scheme:dark;color:#e2eaf0;background:#101a25;--navy:#e2eaf0;--accent:#75d4c7;--accent-hover:#9de4da;--accent-soft:#183b3b;--surface:#192735;--line:#354655;--muted:#aebdc8;--red:#ffaaa1;--red-soft:#452b30;--amber:#f3cc84}
[data-theme=dark] button{background:#207d75;color:#fff}[data-theme=dark] button:hover{background:#286f6b}[data-theme=dark] button.secondary{background:#213342;border-color:#526978;color:#e0ebf2}[data-theme=dark] button.secondary:hover{background:#2d4557}[data-theme=dark] button.danger{background:#963d3d;color:#fff}[data-theme=dark] button.danger-outline{background:#322a32;border-color:#91545a;color:#ffb2a9}[data-theme=dark] input,[data-theme=dark] select{background:#132330;border-color:#526978;color:#e2eaf0}[data-theme=dark] input::placeholder{color:#a5b5bf}[data-theme=dark] input[type=file]{background:#142c32}[data-theme=dark] input[type=file]::file-selector-button{background:#24484b;color:#a1e5dc}[data-theme=dark] .sidebar{background:#0c1622}[data-theme=dark] .scroll,[data-theme=dark] .ticket-toolbar{background:var(--surface)}[data-theme=dark] th{background:#203140;color:#b6c8d2;border-color:#354655}[data-theme=dark] td{color:#dce6ed;border-color:#304251}[data-theme=dark] tbody tr:hover{background:#203645}[data-theme=dark] .cell-ticket>.ui-icon{background:#263d48;color:#b1d3d8}[data-theme=dark] .stat-icon{background:#203b3c;border-color:#355b59}[data-theme=dark] .badge{background:#1c4237;color:#9ae5bd}[data-theme=dark] .badge.review{background:#493c25;color:#f5d38c}[data-theme=dark] .badge.off,[data-theme=dark] .badge.deleted{background:#4b2c32;color:#ffb2a9}[data-theme=dark] .warning{background:#352f23;border-color:#78603c}[data-theme=dark] .warning p{color:#e1cca4}[data-theme=dark] .codes{background:#132330}[data-theme=dark] .auth,[data-theme=dark] .auth-content{background:#101a25}[data-theme=dark] .auth-brand{background:#0c1622}[data-theme=dark] .confirm-dialog{color:#e2eaf0}[data-theme=dark] #notice{background:#284558;color:#f3f8fb}[data-theme=dark] .image-link{background:transparent;color:var(--accent)}[data-theme=dark] .image-link:hover{background:var(--accent-soft)}
@media(max-width:760px){.top-controls{gap:7px;max-width:160px}.auth-content{padding-top:60px}.auth-content>.theme-toggle{top:0;right:18px}.image-viewer{width:calc(100vw - 24px);height:calc(100dvh - 24px);resize:none}.viewer-header{cursor:default}.viewer-tools button{min-height:44px}[data-theme=dark] .sidebar nav{background:#142432}[data-theme=dark] .sidebar nav button{background:transparent;color:#b8cbd5}[data-theme=dark] .sidebar nav button.selected{background:#234644;color:#9ee9df}[data-theme=dark] tbody tr{background:var(--surface)}[data-theme=dark] td::before{color:#aebdc8}[data-theme=dark] .auth-brand{background:transparent}[data-theme=dark] .auth-brand>p{color:var(--muted)}}
`;

export const adminJs = String.raw`
const root = document.getElementById('app'),
  notice = document.getElementById('notice');
let me = null,
  tab = 'overview',
  timer;
const titles = {
  overview: 'Resumen',
  tickets: 'Tickets',
  requests: 'Solicitudes',
  access: 'Acceso al bot',
  users: 'Usuarios',
  audit: 'Actividad',
  account: 'Mi cuenta',
};
function node(tag, text, cls) {
  const e = document.createElement(tag);
  if (text !== undefined) e.textContent = text;
  if (cls) e.className = cls;
  return e;
}
function icon(name) {
  const paths = {
    ticket: ['M6 3h12v18l-3-2-3 2-3-2-3 2V3Z', 'M9 8h6M9 12h6'],
    overview: ['m3 10 9-7 9 7', 'M5 9v12h14V9', 'M9 21v-7h6v7'],
    users: [
      'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2',
      'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8',
      'M22 21v-2a4 4 0 0 0-3-3.87',
      'M16 3.13a4 4 0 0 1 0 7.75',
    ],
    requests: ['M4 4h16v16H4z', 'M4 14h5l2 3h2l2-3h5', 'M8 8h8'],
    access: ['m22 2-7 20-4-9-9-4 20-7Z', 'M22 2 11 13'],
    audit: ['M3 12h4l3-8 4 16 3-8h4'],
    account: ['M20 21a8 8 0 0 0-16 0', 'M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10'],
    logout: ['M9 21H4V3h5', 'M9 12h12m-4-4 4 4-4 4'],
    check: ['m5 12 4 4L19 6'],
    plus: ['M12 5v14M5 12h14'],
    download: ['M12 3v12m-4-4 4 4 4-4', 'M4 15v6h16v-6'],
    upload: ['M12 16V3m-4 4 4-4 4 4', 'M4 16v5h16v-5'],
    edit: ['m16 3 5 5-12 12-6 1 1-6L16 3Z', 'm14 5 5 5'],
    trash: ['M3 6h18M9 6V3h6v3', 'M5 6l1 15h12l1-15', 'M10 10v7m4-7v7'],
    close: ['m6 6 12 12M6 18 18 6'],
    lock: ['M5 11h14v10H5z', 'M8 11V7a4 4 0 0 1 8 0v4'],
    enter: ['M4 12h15m-5-5 5 5-5 5'],
  };
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.classList.add('ui-icon');
  for (const d of paths[name] || paths.ticket) {
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', d);
    svg.append(p);
  }
  return svg;
}
const themeMedia = window.matchMedia('(prefers-color-scheme: dark)');
let savedTheme;
try { savedTheme = localStorage.getItem('ticketslicy-theme'); } catch {}
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelectorAll('.theme-toggle').forEach(b => {
    b.textContent = theme === 'dark' ? 'Modo claro' : 'Modo oscuro';
    b.setAttribute('aria-pressed', String(theme === 'dark'));
  });
}
applyTheme(savedTheme === 'dark' || savedTheme === 'light' ? savedTheme : themeMedia.matches ? 'dark' : 'light');
themeMedia.addEventListener('change', event => { if (!savedTheme) applyTheme(event.matches ? 'dark' : 'light'); });
function themeButton() {
  const b = button('', () => {
    savedTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem('ticketslicy-theme', savedTheme); } catch {}
    applyTheme(savedTheme);
  }, 'secondary theme-toggle');
  const dark = document.documentElement.dataset.theme === 'dark';
  b.textContent = dark ? 'Modo claro' : 'Modo oscuro';
  b.setAttribute('aria-pressed', String(dark));
  return b;
}
let closeImageViewer = () => {};
function openImageViewer(ticket, trigger) {
  closeImageViewer();
  const viewer = node('dialog', undefined, 'image-viewer');
  viewer.setAttribute('aria-label', 'Imagen del ticket: ' + ticket.comercio);
  const header = node('div', undefined, 'viewer-header');
  header.tabIndex = 0;
  header.setAttribute('aria-label', 'Mover ventana: arrastra o usa las flechas del teclado');
  header.append(node('strong', ticket.comercio));
  const close = button('Cerrar', () => closeImageViewer(), 'secondary');
  header.append(close);
  const tools = node('div', undefined, 'viewer-tools');
  const stage = node('div', undefined, 'viewer-stage');
  const image = document.createElement('img');
  image.alt = 'Ticket de ' + ticket.comercio;
  image.draggable = false;
  image.src = '/admin/api/tickets/' + encodeURIComponent(ticket.operationId) + '/image';
  const status = node('span', 'Cargando imagen…', 'viewer-status');
  status.setAttribute('role', 'status');
  let scale = 1, x = 0, y = 0;
  const draw = () => { image.style.transform = 'translate(' + x + 'px,' + y + 'px) scale(' + scale + ')'; percent.textContent = Math.round(scale * 100) + '%'; };
  const zoom = amount => { scale = Math.max(1, Math.min(6, scale + amount)); if (scale === 1) x = y = 0; draw(); };
  const minus = button('−', () => zoom(-0.25), 'secondary'); minus.setAttribute('aria-label', 'Reducir imagen');
  const plus = button('+', () => zoom(0.25), 'secondary'); plus.setAttribute('aria-label', 'Ampliar imagen');
  const percent = node('span', '100%', 'viewer-percent');
  const fit = button('Ajustar', () => { scale = 1; x = y = 0; draw(); }, 'secondary');
  tools.append(minus, percent, plus, fit);
  stage.append(image, status);
  image.onload = () => status.remove();
  image.onerror = () => { status.textContent = 'No se pudo cargar la imagen. Cierra el visor y vuelve a intentarlo.'; image.remove(); };
  viewer.append(header, tools, stage);
  const controller = new AbortController();
  const resizeObserver = new ResizeObserver(() => { const b = viewer.getBoundingClientRect(); move(b.left, b.top); });
  resizeObserver.observe(viewer);
  closeImageViewer = () => {
    controller.abort(); resizeObserver.disconnect(); viewer.close(); viewer.remove();
    if (trigger?.isConnected) trigger.focus();
    closeImageViewer = () => {};
  };
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !document.querySelector('.confirm-dialog[open]')) { event.preventDefault(); closeImageViewer(); }
  }, {signal:controller.signal});
  function move(left, top) {
    viewer.style.left = Math.max(0, Math.min(left, innerWidth - viewer.offsetWidth)) + 'px';
    viewer.style.top = Math.max(0, Math.min(top, innerHeight - viewer.offsetHeight)) + 'px';
  }
  header.addEventListener('pointerdown', event => {
    if (event.target.closest('button') || event.button !== 0 || innerWidth <= 760) return;
    const bounds = viewer.getBoundingClientRect(), startX = event.clientX, startY = event.clientY;
    header.setPointerCapture(event.pointerId);
    const drag = e => move(bounds.left + e.clientX - startX, bounds.top + e.clientY - startY);
    header.addEventListener('pointermove', drag);
    header.addEventListener('lostpointercapture', () => header.removeEventListener('pointermove', drag), {once:true});
  });
  header.addEventListener('keydown', event => {
    if (event.target !== header || !['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)) return;
    event.preventDefault(); const b = viewer.getBoundingClientRect();
    move(b.left + (event.key === 'ArrowLeft' ? -20 : event.key === 'ArrowRight' ? 20 : 0), b.top + (event.key === 'ArrowUp' ? -20 : event.key === 'ArrowDown' ? 20 : 0));
  });
  stage.addEventListener('pointerdown', event => {
    if (event.button !== 0 || scale === 1) return;
    stage.setPointerCapture(event.pointerId);
    const startX = event.clientX - x, startY = event.clientY - y;
    const pan = e => { const maxX = stage.clientWidth * (scale - 1) / 2, maxY = stage.clientHeight * (scale - 1) / 2; x = Math.max(-maxX, Math.min(maxX, e.clientX - startX)); y = Math.max(-maxY, Math.min(maxY, e.clientY - startY)); draw(); };
    stage.addEventListener('pointermove', pan);
    stage.addEventListener('lostpointercapture', () => stage.removeEventListener('pointermove', pan), {once:true});
  });
  window.addEventListener('resize', () => { const b = viewer.getBoundingClientRect(); move(b.left, b.top); }, {signal:controller.signal});
  document.body.append(viewer);
  viewer.show();
  move((innerWidth - viewer.offsetWidth) / 2, Math.max(12, (innerHeight - viewer.offsetHeight) / 2));
  close.focus();
}
function imageButton(ticket) {
  const b = button('Ver imagen', () => openImageViewer(ticket, b), 'image-link');
  return b;
}

function brand() {
  const row = node('div', undefined, 'brand'),
    mark = node('span', undefined, 'brand-mark');
  mark.append(icon('ticket'));
  row.append(mark, node('strong', 'TicketsLicY'));
  return row;
}
function confirmAction(message) {
  if (!window.HTMLDialogElement) return Promise.resolve(window.confirm(message));
  return new Promise((resolve) => {
    const previous = document.activeElement,
      dialog = node('dialog', undefined, 'confirm-dialog');
    const destructive = message.startsWith('¿Eliminar') || message.startsWith('¿Borrar');
    const heading = node(
      'h2',
      destructive
        ? message.startsWith('¿Borrar')
          ? 'Borrar definitivamente'
          : 'Eliminar'
        : 'Confirmar',
    );
    heading.id = 'confirmation-heading';
    dialog.setAttribute('aria-labelledby', heading.id);
    let finished = false;
    const finish = (value) => {
      if (finished) return;
      finished = true;
      dialog.close();
      dialog.remove();
      resolve(value);
      setTimeout(() => {
        if (previous?.isConnected) previous.focus();
      }, 0);
    };
    const actions = node('div', undefined, 'actions');
    actions.append(
      button('Cancelar', () => finish(false), 'secondary'),
      button('Confirmar', () => finish(true), destructive ? 'danger' : ''),
    );
    dialog.append(heading, node('p', message), actions);
    dialog.addEventListener('cancel', (event) => {
      event.preventDefault();
      finish(false);
    });
    dialog.addEventListener('click', (event) => {
      const b = dialog.getBoundingClientRect();
      if (
        event.target === dialog &&
        (event.clientX < b.left ||
          event.clientX > b.right ||
          event.clientY < b.top ||
          event.clientY > b.bottom)
      )
        finish(false);
    });
    document.body.append(dialog);
    dialog.showModal();
    actions.firstChild.focus();
  });
}
function show(message) {
  notice.textContent = message;
  notice.classList.add('visible');
  clearTimeout(timer);
  timer = setTimeout(() => notice.classList.remove('visible'), 8000);
}
async function api(path, body) {
  const response = await fetch('/admin/api/' + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) {
    if (response.status === 401 && me) {
      me = null;
      await start();
    }
    const error = Error(data.error || 'No se pudo completar.');
    error.code = data.code;
    throw error;
  }
  return data;
}
function button(text, action, cls = '') {
  const b = node('button', text, cls);
  b.type = 'button';
  const glyphs = {
    Resumen: 'overview',
    Tickets: 'ticket',
    Solicitudes: 'requests',
    'Acceso al bot': 'access',
    Usuarios: 'users',
    Actividad: 'audit',
    'Mi cuenta': 'account',
    'Cerrar sesión': 'logout',
    'Exportar vista CSV': 'download',
    'Crear usuario': 'plus',
    'Crear cuenta': 'plus',
    'Dar acceso al bot': 'plus',
    'Importar imágenes': 'upload',
    'Descargar códigos': 'download',
    Corregir: 'edit',
    Eliminar: 'trash',
    'Borrar definitivamente': 'trash',
    Cancelar: 'close',
    Entrar: 'enter',
  };
  if (glyphs[text]) b.prepend(icon(glyphs[text]));
  if (cls.includes('danger') && text !== 'Borrar definitivamente')
    b.classList.add('danger-outline');
  b.onclick = async () => {
    b.disabled = true;
    try {
      await action();
    } catch (e) {
      show(e.message);
    } finally {
      b.disabled = false;
    }
  };
  return b;
}
function field(form, label, name, type = 'text', value = '', required = true) {
  form.classList.add('form-grid');
  const wrap = node('div', undefined, 'form-field'),
    id = 'f-' + name;
  const lab = node('label', label);
  lab.htmlFor = id;
  const input = document.createElement('input');
  input.id = id;
  input.name = name;
  input.type = type;
  input.required = required;
  input.value = value;
  if (type === 'password') {
    input.minLength = 12;
    input.maxLength = 128;
    input.autocomplete = name === 'currentPassword' ? 'current-password' : 'new-password';
  }
  if (name === 'username') input.autocomplete = 'username';
  wrap.append(lab, input);
  form.append(wrap);
  return input;
}
function select(form, label, name, choices) {
  form.classList.add('form-grid');
  const wrap = node('div', undefined, 'form-field'),
    l = node('label', label),
    s = document.createElement('select');
  s.name = name;
  s.id = 'f-' + name;
  l.htmlFor = s.id;
  choices.forEach(([v, t]) => {
    const o = node('option', t);
    o.value = v;
    s.append(o);
  });
  wrap.append(l, s);
  form.append(wrap);
  return s;
}
function submit(form, text, action) {
  const b = node('button', text);
  b.type = 'submit';
  b.prepend(icon(text === 'Entrar' ? 'enter' : 'check'));
  const row = node('div', undefined, 'actions');
  row.append(b);
  form.append(row);
  form.onsubmit = async (e) => {
    e.preventDefault();
    b.disabled = true;
    try {
      await action(Object.fromEntries(new FormData(form)));
    } catch (err) {
      show(err.message);
    } finally {
      b.disabled = false;
    }
  };
}
function card(title) {
  const c = node('section', undefined, 'card');
  if (title) c.append(node('h2', title));
  return c;
}
function table(headers, rows) {
  const wrap = node('div', undefined, 'scroll'),
    t = node('table'),
    head = node('thead'),
    tr = node('tr');
  headers.forEach((h) => tr.append(node('th', h)));
  head.append(tr);
  t.append(head);
  const body = node('tbody');
  rows.forEach((cells) => {
    const r = node('tr');
    cells.forEach((c, index) => {
      const td = node('td');
      td.dataset.label = headers[index];
      if (['Fecha', 'Total', 'ID Telegram', 'Telegram'].includes(headers[index]))
        td.classList.add('numeric');
      if (headers[index] === 'Estado' && typeof c === 'string') {
        const status = node('span', c, 'badge');
        if (c === 'Revisar') status.classList.add('review');
        else if (c === 'Eliminado' || c === 'Suspendido') status.classList.add('off');
        td.append(status);
      } else if (headers[index] === 'Comercio' && typeof c === 'string') {
        const entry = node('div', undefined, 'cell-ticket');
        entry.append(icon('ticket'), node('span', c));
        td.append(entry);
      } else td.append(c instanceof Node ? c : document.createTextNode(String(c ?? '')));
      r.append(td);
    });
    body.append(r);
  });
  t.append(body);
  wrap.append(t);
  if (!rows.length) wrap.append(node('p', 'No hay registros todavía.', 'empty'));
  return wrap;
}
function badge(active) {
  return node('span', active ? 'Activo' : 'Revocado', 'badge' + (active ? '' : ' off'));
}
async function auth(mode = 'login', status) {
  closeImageViewer();
  root.replaceChildren();
  const outer = node('main', undefined, 'auth');
  document.body.classList.add('auth-view');
  const visual = node('section', undefined, 'auth-brand'),
    identity = brand();
  const title = node('h1', 'TicketsLicY');
  identity.replaceChild(title, identity.lastChild);
  visual.append(identity, node('p', 'Tus tickets y accesos, en un solo lugar.'));
  const receipt = node('div', undefined, 'receipt-art');
  receipt.setAttribute('aria-hidden', 'true');
  receipt.append(icon('ticket'));
  for (const kind of ['', 'short', '', '', 'short', 'total'])
    receipt.append(node('div', undefined, 'receipt-line ' + kind));
  visual.append(receipt);
  const authContent = node('section', undefined, 'auth-content');
  authContent.append(themeButton());
  outer.append(visual, authContent);
  const c = card(
    mode === 'setup'
      ? 'Crea tu cuenta principal'
      : mode === 'recover'
        ? 'Recuperar acceso'
        : 'Iniciar sesión',
  );
  const f = document.createElement('form');
  if (mode === 'setup') {
    c.append(
      node(
        'p',
        'Elige tu usuario y contraseña. El código de instalación lo entrega quien configura el panel.',
      ),
    );
    field(f, 'Código de instalación', 'token', 'password');
  }
  if (mode === 'recover') field(f, 'Código de recuperación', 'code', 'text');
  else field(f, 'Usuario', 'username');
  field(
    f,
    mode === 'login' ? 'Contraseña' : 'Nueva contraseña (mínimo 12 caracteres)',
    'password',
    'password',
  );
  if (mode === 'login') f.elements.password.autocomplete = 'current-password';
  submit(
    f,
    mode === 'setup' ? 'Crear cuenta' : mode === 'recover' ? 'Cambiar contraseña' : 'Entrar',
    async (data) => {
      if (mode === 'setup') {
        const result = await api('setup', data);
        c.replaceChildren(
          node('h2', 'Guarda tus códigos de recuperación'),
          node(
            'p',
            'Cada código sirve una sola vez para recuperar tu cuenta sin correo. Guárdalos fuera del panel.',
          ),
        );
        const codes = node('div', undefined, 'codes');
        result.recoveryCodes.forEach((code) => codes.append(node('p', code)));
        c.append(
          codes,
          button('Descargar códigos', () => {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(
              new Blob(
                [
                  [
                    'Usuario: ' + data.username,
                    'Panel: ' + location.origin + '/admin',
                    '',
                    ...result.recoveryCodes,
                  ].join('\n'),
                ],
                { type: 'text/plain' },
              ),
            );
            a.download = 'codigos-recuperacion.txt';
            a.click();
            setTimeout(() => URL.revokeObjectURL(a.href), 1000);
          }),
          button('Ir al inicio de sesión', () => auth('login'), 'secondary'),
        );
      } else if (mode === 'recover') {
        await api('recover', data);
        show('Contraseña cambiada. Inicia sesión.');
        await auth('login');
      } else {
        me = await api('login', data);
        tab = 'overview';
        await render();
      }
    },
  );
  c.append(f);
  if (mode === 'login')
    c.append(button('Usar un código de recuperación', () => auth('recover'), 'secondary'));
  else if (mode === 'recover') c.append(button('Volver', () => auth('login'), 'secondary'));
  authContent.append(c);
  root.append(outer);
}
async function start() {
  try {
    const s = await api('status');
    if (!s.initialized) {
      if (!s.setupAvailable) {
        root.replaceChildren(
          node(
            'main',
            'El panel está preparado. Falta configurar el código de instalación para crear la cuenta principal.',
            'auth-message',
          ),
        );
        return;
      }
      await auth('setup', s);
      return;
    }
    try {
      me = await api('me');
    } catch {
      me = null;
    }
    if (me) await render();
    else await auth();
  } catch (e) {
    root.replaceChildren(node('main', e.message, 'auth-message'));
  }
}
async function render() {
  document.body.classList.remove('auth-view');
  root.replaceChildren();
  const shell = node('div', undefined, 'shell'),
    side = node('aside', undefined, 'sidebar');
  side.append(brand(), node('small', 'Panel de administración', 'sidebar-caption'));
  const nav = node('nav');
  nav.setAttribute('aria-label', 'Navegación principal');
  const keys = me.role === 'admin' ? Object.keys(titles) : ['overview', 'tickets', 'account'];
  keys.forEach((key) =>
    nav.append(
      button(
        titles[key],
        async () => {
          tab = key;
          await render();
        },
        key === tab ? 'selected' : '',
      ),
    ),
  );
  Array.from(nav.children).forEach((item, index) => {
    if (keys[index] === tab) item.setAttribute('aria-current', 'page');
  });
  const profile = node('div', undefined, 'sidebar-user'),
    identity = node('div');
  profile.append(node('span', me.username.slice(0, 2).toUpperCase(), 'avatar'));
  identity.append(
    node('strong', me.username),
    node('small', me.role === 'admin' ? 'Administrador' : 'Usuario'),
  );
  profile.append(identity);
  side.append(nav, profile);
  const main = node('main'),
    top = node('div', undefined, 'top'),
    heading = node('div');
  heading.append(
    node('h1', titles[tab]),
    node('small', me.username + ' · ' + (me.role === 'admin' ? 'Administrador' : 'Usuario')),
  );
  const controls = node('div', undefined, 'top-controls');
  controls.append(
    themeButton(),
    button(
      'Cerrar sesión',
      async () => {
        await api('logout', {});
        me = null;
        await start();
      },
      'secondary',
    ),
  );
  top.append(heading, controls);
  main.append(top);
  shell.append(side, main);
  root.append(shell);
  try {
    await content(main);
  } catch (e) {
    sectionError(main, e);
  }
}
function sectionError(main, error) {
  const c = card(
    error.code === 'HISTORY_IMPORT_PENDING'
      ? 'Preparando el historial'
      : 'No se pudo cargar esta sección',
  );
  c.classList.add('warning');
  c.append(node('p', error.message));
  const actions = node('div', undefined, 'actions');
  actions.append(button('Reintentar', () => render(), 'secondary'));
  c.append(actions);
  main.append(c);
}
async function historyImages(main) {
  const state = await api('storage');
  if (!state.imagesPending && !state.warnings) return;
  const c = card('Imágenes del historial anterior');
  c.append(
    node(
      'p',
      state.imagesPending +
        ' registros necesitan su imagen original. Los datos del ticket ya están en el panel.',
    ),
  );
  if (state.warnings)
    c.append(
      node(
        'p',
        state.warnings + ' registros anteriores necesitan revisión; sus originales se conservaron.',
      ),
    );
  const f = document.createElement('form'),
    label = node('label', 'Selecciona las fotos originales exportadas del sistema anterior'),
    input = document.createElement('input');
  input.type = 'file';
  input.multiple = true;
  input.accept = 'image/jpeg,image/png';
  input.id = 'history-images';
  label.htmlFor = input.id;
  f.append(label, input);
  submit(f, 'Importar imágenes', async () => {
    const files = Array.from(input.files);
    if (!files.length) throw Error('Selecciona al menos una imagen.');
    if (files.length > 100) throw Error('Selecciona hasta 100 imágenes por lote.');
    let imported = 0,
      failed = [];
    for (const file of files) {
      try {
        if (file.size > 5000000) throw Error('Supera 5 MB');
        const response = await fetch('/admin/api/import-images', {
          method: 'POST',
          headers: { 'Content-Type': file.type || 'application/octet-stream' },
          body: file,
        });
        const data = await response.json();
        if (!response.ok) throw Error(data.error || 'No se pudo importar');
        imported += data.imported;
      } catch (e) {
        failed.push(file.name + ': ' + e.message);
      }
    }
    const result = node(
      'p',
      imported +
        ' imágenes recuperadas.' +
        (failed.length
          ? ' No se pudieron importar ' + failed.length + ': ' + failed.slice(0, 10).join('; ')
          : ''),
    );
    c.append(result);
    input.value = '';
    show('Importación terminada. Cambia de sección para actualizar la lista.');
  });
  c.append(f);
  main.append(c);
}
async function content(main) {
  if (tab === 'overview') {
    const results = await Promise.allSettled([
      api('tickets'),
      me.role === 'admin' ? api('requests') : Promise.resolve(null),
    ]);
    if (!me) return;
    const ticketResult = results[0],
      requestResult = results[1],
      grid = node('div', undefined, 'grid');
    const stat = (label, value) => {
      const c = card();
      const emblem = node('span', undefined, 'stat-icon');
      emblem.append(
        icon(
          label.includes('Solicitudes')
            ? 'requests'
            : label === 'Tickets guardados'
              ? 'ticket'
              : 'overview',
        ),
      );
      c.append(node('small', label), node('div', String(value), 'stat'), emblem);
      grid.append(c);
    };
    if (ticketResult.status === 'fulfilled') {
      const visible = ticketResult.value.filter((t) => t.estado !== 'Eliminado');
      stat('Tickets guardados', visible.length);
      const totals = {};
      visible.forEach((t) => (totals[t.moneda] = (totals[t.moneda] || 0) + t.total));
      Object.entries(totals).forEach(([m, v]) => stat('Total ' + m, v.toFixed(2)));
    } else stat('Tickets guardados', '—');
    if (me.role === 'admin')
      stat(
        'Solicitudes pendientes',
        requestResult.status === 'fulfilled' ? requestResult.value.length : '—',
      );
    main.append(grid);
    if (ticketResult.status === 'rejected') sectionError(main, ticketResult.reason);
    if (requestResult.status === 'rejected') sectionError(main, requestResult.reason);
    main.append(
      node(
        'p',
        'Consulta tus registros en Tickets. Los cambios de acceso se administran desde este panel.',
        'muted',
      ),
    );
  }
  if (tab === 'users') {
    const c = card('Crear usuario'),
      f = document.createElement('form');
    field(f, 'Usuario', 'username');
    field(f, 'Contraseña inicial', 'password', 'password');
    select(f, 'Permisos', 'role', [
      ['user', 'Solo sus tickets'],
      ['admin', 'Administrador'],
    ]);
    field(f, 'ID de Telegram (opcional)', 'chatId', 'text', '', false);
    submit(f, 'Crear usuario', async (data) => {
      await api('users', data);
      show('Usuario creado.');
      await render();
    });
    c.append(f);
    main.append(c);
    const users = await api('users');
    main.append(
      table(
        ['Usuario', 'Permisos', 'Telegram', 'Estado', 'Acciones'],
        users.map((u) => {
          const actions = node('div');
          if (!u.owner && u.id !== me.id) {
            actions.append(
              button(
                u.active ? 'Suspender' : 'Activar',
                async () => {
                  if (!(await confirmAction('¿Cambiar el acceso de ' + u.username + '?'))) return;
                  await api('users/' + u.id, { active: !u.active });
                  await render();
                },
                'secondary',
              ),
            );
            actions.append(
              button(
                'Nueva contraseña',
                () => {
                  const reset = card('Cambiar contraseña de ' + u.username),
                    form = document.createElement('form');
                  field(form, 'Nueva contraseña', 'password', 'password');
                  submit(form, 'Guardar', async (data) => {
                    await api('users/' + u.id, data);
                    show('Contraseña cambiada y sesiones cerradas.');
                    await render();
                  });
                  reset.append(form);
                  main.querySelector('.top').after(reset);
                },
                'secondary',
              ),
            );
          }
          return [
            u.username,
            u.role === 'admin' ? 'Administrador' : 'Usuario',
            u.chat_id || 'Sin vincular',
            u.active ? 'Activo' : 'Suspendido',
            u.owner ? 'Cuenta principal' : actions,
          ];
        }),
      ),
    );
  }
  if (tab === 'access') {
    const c = card('Autorizar Telegram'),
      f = document.createElement('form');
    field(f, 'Nombre de la persona', 'name');
    field(f, 'ID de Telegram', 'chatId');
    submit(f, 'Dar acceso al bot', async (data) => {
      await api('access', { ...data, status: 'active' });
      show('Acceso autorizado.');
      await render();
    });
    c.append(f);
    main.append(c);
    main.append(
      node(
        'p',
        'Revocar bloquea el bot. Suspender una cuenta en Usuarios bloquea tanto el panel como el bot.',
        'muted',
      ),
    );
    const rows = await api('access');
    main.append(
      table(
        ['Persona', 'ID Telegram', 'Cuenta del panel', 'Estado', 'Acciones'],
        rows.map((r) => [
          r.display_name,
          r.chat_id,
          r.username || 'Solo bot',
          r.account_active === 0
            ? node('span', 'Cuenta suspendida', 'badge off')
            : badge(r.status === 'active'),
          r.owner
            ? 'Propietario'
            : button(
                r.status === 'active' ? 'Revocar' : 'Autorizar',
                async () => {
                  if (
                    !(await confirmAction('¿Cambiar el acceso al bot de ' + r.display_name + '?'))
                  )
                    return;
                  await api('access', {
                    chatId: r.chat_id,
                    status: r.status === 'active' ? 'revoked' : 'active',
                  });
                  await render();
                },
                r.status === 'active' ? 'danger' : 'secondary',
              ),
        ]),
      ),
    );
  }
  if (tab === 'requests') {
    const rows = await api('requests');
    main.append(
      node(
        'p',
        'Las personas solicitan acceso desde el bot. Aprobar permite usar Telegram; la cuenta del panel se crea en Usuarios.',
        'muted',
      ),
    );
    main.append(
      table(
        ['Persona', 'ID Telegram', 'Fecha', 'Acciones'],
        rows.map((r) => {
          const a = node('div');
          for (const [action, label] of [
            ['approve', 'Aprobar'],
            ['reject', 'Rechazar'],
          ])
            a.append(
              button(
                label,
                async () => {
                  await api('requests', { chatId: r.chat_id, action });
                  await render();
                },
                action === 'reject' ? 'secondary' : '',
              ),
            );
          return [r.display_name, r.chat_id, r.requested_at, a];
        }),
      ),
    );
  }
  if (tab === 'audit') {
    const rows = await api('audit');
    const labels = {
      setup: 'Cuenta principal creada',
      login: 'Inicio de sesión',
      user_create: 'Usuario creado',
      user_status: 'Estado de cuenta modificado',
      password_reset: 'Contraseña restablecida',
      password_change: 'Contraseña cambiada',
      bot_active: 'Acceso al bot autorizado',
      bot_revoked: 'Acceso al bot revocado',
      request_approve: 'Solicitud aprobada',
      request_reject: 'Solicitud rechazada',
      ticket_create: 'Ticket registrado',
      ticket_confirm: 'Ticket confirmado',
      ticket_edit: 'Ticket corregido',
      ticket_delete: 'Ticket eliminado',
      image_import: 'Imágenes anteriores importadas',
      ticket_purge: 'Ticket borrado definitivamente',
    };
    main.append(
      table(
        ['Fecha', 'Responsable', 'Acción', 'Referencia'],
        rows.map((r) => [r.created_at, r.actor, labels[r.action] || r.action, r.target]),
      ),
    );
  }
  if (tab === 'account') {
    const c = card('Cambiar mi contraseña'),
      f = document.createElement('form');
    field(f, 'Contraseña actual', 'currentPassword', 'password');
    field(f, 'Nueva contraseña', 'password', 'password');
    submit(f, 'Guardar y cerrar sesión', async (data) => {
      await api('password', data);
      me = null;
      show('Contraseña cambiada. Vuelve a entrar.');
      await start();
    });
    c.append(f);
    main.append(c);
  }
  if (tab === 'tickets') {
    const tickets = await api('tickets');
    if (me.role === 'admin') await historyImages(main);
    const filter = node('input');
    filter.placeholder = 'Buscar por comercio, fecha, categoría o usuario';
    filter.setAttribute('aria-label', 'Filtrar tickets');
    const area = node('div'),
      toolbar = node('div', undefined, 'ticket-toolbar');
    toolbar.append(
      button(
        'Exportar vista CSV',
        () => {
          const q = filter.value.toLowerCase();
          const rows = tickets.filter((t) =>
            [t.comercio, t.fecha, t.categoria, String(t.userId)].some((x) =>
              x.toLowerCase().includes(q),
            ),
          );
          const cell = (v) =>
            '\"' +
            String(v ?? '')
              .replace(/^[=+@\s-]/, (x) => String.fromCharCode(39) + x)
              .replaceAll('\"', '\"\"') +
            '\"';
          const csv = [
            ['Fecha', 'Comercio', 'Total', 'Moneda', 'Categoría', 'Usuario', 'Estado', 'ID'],
            ...rows.map((t) => [
              t.fecha,
              t.comercio,
              t.total,
              t.moneda,
              t.categoria,
              t.userId,
              t.estado,
              t.operationId,
            ]),
          ]
            .map((row) => row.map(cell).join(','))
            .join('\r\n');
          const a = document.createElement('a');
          a.href = URL.createObjectURL(
            new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }),
          );
          a.download = 'tickets.csv';
          a.click();
          setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        },
        'secondary',
      ),
      filter,
    );
    main.append(toolbar, area);
    const draw = () => {
      const q = filter.value.toLowerCase();
      area.replaceChildren(
        table(
          ['Fecha', 'Comercio', 'Total', 'Categoría', 'Usuario', 'Estado', 'Imagen', 'Acciones'],
          tickets
            .filter((t) =>
              [t.comercio, t.fecha, t.categoria, String(t.userId)].some((x) =>
                x.toLowerCase().includes(q),
              ),
            )
            .map((t) => {
              const actions = node('div');
              if (t.estado !== 'Eliminado')
                actions.append(
                  button('Corregir', () => editTicket(main, t), 'secondary'),
                  button(
                    'Eliminar',
                    async () => {
                      if (
                        !(await confirmAction(
                          '¿Eliminar este ticket de las consultas? Su registro e imagen quedarán conservados para revisión.',
                        ))
                      )
                        return;
                      await api('tickets', { id: t.operationId, action: 'delete' });
                      await render();
                    },
                    'danger',
                  ),
                );
              if (t.estado === 'Eliminado' && me.role === 'admin')
                actions.append(
                  button(
                    'Borrar definitivamente',
                    async () => {
                      if (
                        !(await confirmAction(
                          '¿Borrar definitivamente este registro y su imagen? No se podrá recuperar desde el panel.',
                        ))
                      )
                        return;
                      await api('tickets', { id: t.operationId, action: 'purge' });
                      await render();
                    },
                    'danger',
                  ),
                );
              let image = node('span', 'Pendiente de importar', 'muted');
              if (t.imageAvailable) {
                image = imageButton(t);
              }
              return [
                t.fecha,
                t.comercio,
                t.total.toFixed(2) + ' ' + t.moneda,
                t.categoria,
                t.userId,
                t.estado,
                image,
                actions,
              ];
            }),
        ),
      );
    };
    filter.oninput = draw;
    draw();
  }
}
function editTicket(main, t) {
  document.getElementById('ticket-editor')?.remove();
  const c = card('Corregir ticket');
  c.id = 'ticket-editor';
  c.classList.add('ticket-editor');
  const f = document.createElement('form');
  field(f, 'Fecha', 'fecha', 'date', t.fecha);
  field(f, 'Comercio', 'comercio', 'text', t.comercio);
  const amount = field(f, 'Total', 'total', 'number', String(t.total));
  amount.step = '0.01';
  amount.min = '0';
  const category = select(
    f,
    'Categoría',
    'categoria',
    ['Alimentos', 'Transporte', 'Hospedaje', 'Insumos', 'Servicios', 'Otros'].map((x) => [x, x]),
  );
  category.value = t.categoria;
  submit(f, 'Guardar corrección', async (data) => {
    await api('tickets', {
      id: t.operationId,
      action: 'edit',
      patch: { ...data, total: Number(data.total) },
    });
    show('Ticket actualizado.');
    await render();
  });
  f.querySelector('.actions').prepend(button('Cancelar', () => c.remove(), 'secondary'));
  const layout = node('div', undefined, 'editor-layout'),
    preview = node('div', undefined, 'editor-photo');
  if (t.imageAvailable) {
    const link = imageButton(t);
    const image = document.createElement('img');
    image.src = '/admin/api/tickets/' + encodeURIComponent(t.operationId) + '/image';
    image.alt = t.comercio;
    image.onerror = () => preview.replaceChildren(icon('ticket'), link);
    preview.append(image, link);
  } else preview.append(icon('ticket'), node('span', 'Pendiente de importar', 'muted'));
  layout.append(preview, f);
  c.append(layout);
  main.querySelector('.top').after(c);
  c.scrollIntoView({ behavior: 'smooth' });
}
start();
`;
