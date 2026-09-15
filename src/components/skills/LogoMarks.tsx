import dotmetricsMark from '../../assets/dotmetrics-mark.svg';
import nekoAppIcon from '../../assets/neko-app-icon.svg';

const EnformMark = () => (
  <svg viewBox="112 112 798 798" className="size-9" aria-hidden="true">
    <g transform="rotate(-13 512 512)" fill="currentColor">
      <path d="M364.72 232.35h493.09q30.51 0 10.62 23.12L760.85 380.56q-4.19 4.87-10.61 4.87H257.15q-30.51 0-10.62-23.12l107.58-125.09q4.19-4.87 10.61-4.87Z" />
      <path d="M318.75 431.31h493.09q30.5 0 10.61 23.13L714.88 579.53q-4.19 4.87-10.62 4.87H211.17q-30.51 0-10.62-23.13l107.58-125.09q4.19-4.87 10.62-4.87Z" />
      <path d="M271.44 635.8h203.81q30.5 0 10.61 23.13L378.29 784.02q-4.19 4.87-10.62 4.87H163.86q-30.5 0-10.61-23.13l107.57-125.09q4.19-4.87 10.62-4.87ZM578.94 635.8h185.59q30.5 0 10.61 23.13L667.57 784.02q-4.19 4.87-10.62 4.87H471.37q-30.51 0-10.62-23.13l107.58-125.09q4.19-4.87 10.61-4.87Z" />
    </g>
  </svg>
);

const LogoMarks = () => (
  <div className="flex h-full items-center justify-center gap-3">
    <div className="grid size-16 place-items-center rounded-xl border border-border bg-black text-white">
      <EnformMark />
    </div>
    <img src={nekoAppIcon} alt="Neko" className="size-16" />
    <div className="grid size-16 place-items-center rounded-xl border border-border bg-[#f7f1e4]">
      <img src={dotmetricsMark} alt="Dotmetrics" className="size-9" />
    </div>
  </div>
);

export default LogoMarks;
