'use client'

export type EinsteinState = 'idle' | 'thinking' | 'talking' | 'celebrating'

interface EinsteinProps {
  state?: EinsteinState
  size?: number
}

export function Einstein({ state = 'idle', size = 160 }: EinsteinProps) {
  return (
    <div className="relative" style={{ width: size, height: size * 1.4 }}>
      <svg
        viewBox="0 0 160 220"
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size * 1.4}
        style={{ overflow: 'visible' }}
      >
        <defs>
          <radialGradient id="skin" cx="50%" cy="40%" r="50%">
            <stop offset="0%" stopColor="#fdd9a0" />
            <stop offset="100%" stopColor="#f0b060" />
          </radialGradient>
          <radialGradient id="hair" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f0ece0" />
            <stop offset="100%" stopColor="#d8d4c8" />
          </radialGradient>

          <style>{`
            .e-body { animation: breathe 3s ease-in-out infinite; transform-origin: 80px 200px; }
            .e-hair-l { animation: hairL 3s ease-in-out infinite; transform-origin: 55px 130px; }
            .e-hair-r { animation: hairR 3s ease-in-out infinite; transform-origin: 105px 130px; }
            .e-eyes { animation: blink 4.5s ease-in-out infinite; }
            .e-eyebrow-l { animation: ${state === 'thinking' ? 'browDown' : 'browUp'} 0.4s ease-out forwards; }
            .e-eyebrow-r { animation: ${state === 'thinking' ? 'browDown' : 'browUp'} 0.4s ease-out forwards; }
            .e-mustache { animation: ${state === 'talking' ? 'talk' : 'none'} 0.3s ease-in-out infinite alternate; }
            .e-arms { animation: ${state === 'celebrating' ? 'celebrate' : 'none'} 0.5s ease-in-out infinite alternate; transform-origin: 80px 175px; }
            .e-head { animation: ${state === 'thinking' ? 'tilt' : 'none'} 0.5s ease-out forwards; transform-origin: 80px 150px; }

            @keyframes breathe { 0%,100%{transform:scaleY(1)} 50%{transform:scaleY(1.018) translateY(-1.5px)} }
            @keyframes hairL { 0%,100%{transform:rotate(-1.5deg)} 50%{transform:rotate(1.5deg)} }
            @keyframes hairR { 0%,100%{transform:rotate(1.5deg)} 50%{transform:rotate(-1.5deg)} }
            @keyframes blink { 0%,88%,100%{transform:scaleY(1)} 94%{transform:scaleY(0.07)} }
            @keyframes browUp { to { transform: translateY(0); } }
            @keyframes browDown { to { transform: translateY(3px); } }
            @keyframes talk { from{transform:translateY(0)} to{transform:translateY(2px)} }
            @keyframes tilt { to { transform: rotate(-5deg); } }
            @keyframes celebrate { from{transform:rotate(-15deg)} to{transform:rotate(15deg)} }
          `}</style>
        </defs>

        <g className="e-body">
          {/* Shadow */}
          <ellipse cx="80" cy="218" rx="42" ry="6" fill="rgba(0,0,0,0.3)" />

          {/* Coat */}
          <ellipse cx="80" cy="192" rx="50" ry="36" fill="#1e2a10" />
          <path d="M80 158 L55 183 L65 198Z" fill="#141c08" />
          <path d="M80 158 L105 183 L95 198Z" fill="#141c08" />
          <rect x="71" y="158" width="18" height="44" rx="3" fill="#f5f0e0" />
          <path d="M77 162 L83 162 L86 190 L80 197 L74 190Z" fill="#5a3010" />

          {/* Arms */}
          <g className="e-arms">
            <rect x="20" y="170" width="18" height="36" rx="9" fill="#1e2a10" transform="rotate(-10,20,170)" />
            <rect x="122" y="170" width="18" height="36" rx="9" fill="#1e2a10" transform="rotate(10,140,170)" />
          </g>

          {/* Neck */}
          <rect x="70" y="145" width="20" height="18" rx="5" fill="url(#skin)" />

          {/* Head group */}
          <g className="e-head">
            {/* Hair top */}
            <ellipse cx="80" cy="66" rx="50" ry="32" fill="url(#hair)" />
            {/* Hair left */}
            <g className="e-hair-l">
              <ellipse cx="36" cy="80" rx="20" ry="34" fill="url(#hair)" transform="rotate(-18,36,130)" />
              <ellipse cx="24" cy="76" rx="13" ry="24" fill="#e8e4d8" transform="rotate(-28,24,130)" />
            </g>
            {/* Hair right */}
            <g className="e-hair-r">
              <ellipse cx="124" cy="80" rx="20" ry="34" fill="url(#hair)" transform="rotate(18,124,130)" />
              <ellipse cx="136" cy="76" rx="13" ry="24" fill="#e8e4d8" transform="rotate(28,136,130)" />
            </g>

            {/* Face */}
            <ellipse cx="80" cy="112" rx="48" ry="52" fill="url(#skin)" />

            {/* Ears */}
            <ellipse cx="33" cy="118" rx="9" ry="13" fill="#f0b060" />
            <ellipse cx="127" cy="118" rx="9" ry="13" fill="#f0b060" />

            {/* Eyebrows */}
            <g className="e-eyebrow-l">
              <path d="M47 88 Q57 81 67 85" stroke="#e8e4d8" strokeWidth="5" fill="none" strokeLinecap="round" />
            </g>
            <g className="e-eyebrow-r">
              <path d="M93 85 Q103 81 113 88" stroke="#e8e4d8" strokeWidth="5" fill="none" strokeLinecap="round" />
            </g>

            {/* Eyes */}
            <g className="e-eyes" style={{ transformOrigin: '57px 108px' }}>
              <ellipse cx="57" cy="108" rx="11" ry="10" fill="white" />
              <ellipse cx="58" cy="109" rx="7" ry="7.5" fill="#4a3820" />
              <ellipse cx="58" cy="109" rx="4.5" ry="5" fill="#1a0a00" />
              <ellipse cx="61" cy="106" rx="2" ry="2" fill="white" />
            </g>
            <g className="e-eyes" style={{ transformOrigin: '103px 108px' }}>
              <ellipse cx="103" cy="108" rx="11" ry="10" fill="white" />
              <ellipse cx="104" cy="109" rx="7" ry="7.5" fill="#4a3820" />
              <ellipse cx="104" cy="109" rx="4.5" ry="5" fill="#1a0a00" />
              <ellipse cx="107" cy="106" rx="2" ry="2" fill="white" />
            </g>

            {/* Nose */}
            <ellipse cx="80" cy="126" rx="8" ry="6" fill="#e8a050" />
            <ellipse cx="75" cy="130" rx="4" ry="3.5" fill="#d89040" />
            <ellipse cx="85" cy="130" rx="4" ry="3.5" fill="#d89040" />

            {/* Mustache */}
            <g className="e-mustache">
              <path
                d="M47 140 Q56 133 65 137 Q72 141 80 139 Q88 141 95 137 Q104 133 113 140 Q104 150 95 146 Q88 143 80 145 Q72 143 65 146 Q56 150 47 140Z"
                fill="#f0ece0"
              />
            </g>

            {/* Mouth */}
            <path d="M64 152 Q80 158 96 152" stroke="#c08040" strokeWidth="2" fill="none" strokeLinecap="round" />

            {/* Cheek blush */}
            <ellipse cx="40" cy="124" rx="10" ry="7" fill="rgba(240,150,80,0.12)" />
            <ellipse cx="120" cy="124" rx="10" ry="7" fill="rgba(240,150,80,0.12)" />
          </g>
        </g>
      </svg>

      {/* Formula floating */}
      {(state === 'idle' || state === 'thinking') && (
        <div
          className="absolute top-0 right-0 text-accent font-serif font-bold text-sm opacity-70"
          style={{ animation: 'float 4s ease-in-out infinite' }}
        >
          E=mc²
        </div>
      )}

      <style>{`
        @keyframes float {
          0%,100% { transform: translateY(0) rotate(-3deg); opacity: 0.7; }
          50% { transform: translateY(-8px) rotate(3deg); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
