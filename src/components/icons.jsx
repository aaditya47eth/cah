const base = {
  width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
  strokeWidth: 2.4, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true,
}

export const CloseIcon = () => (
  <svg {...base}><path d="M6 6l12 12M18 6L6 18" /></svg>
)

export const HelpIcon = () => (
  <svg {...base} strokeWidth={2}>
    <circle cx="12" cy="12" r="9.5" />
    <path d="M9.4 9.3a2.7 2.7 0 0 1 5.2 1c0 1.8-2.6 2.3-2.6 3.9" />
    <circle cx="12" cy="17.4" r="0.6" fill="currentColor" />
  </svg>
)

export const StarIcon = ({ size = 22 }) => (
  <svg {...base} width={size} height={size} fill="currentColor" stroke="none">
    <path d="M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3L2.9 9.5l6.3-.9z" />
  </svg>
)

export const CopyIcon = () => (
  <svg {...base} width={18} height={18} strokeWidth={2}>
    <rect x="9" y="9" width="11" height="11" rx="2.5" />
    <path d="M5 15V6a2 2 0 0 1 2-2h8" />
  </svg>
)

export const ShareIcon = () => (
  <svg {...base} width={18} height={18} strokeWidth={2}>
    <path d="M12 3v12M7.5 7.5 12 3l4.5 4.5" />
    <path d="M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" />
  </svg>
)

export const InfoIcon = () => (
  <svg {...base} width={26} height={26} strokeWidth={2}>
    <circle cx="12" cy="12" r="9.5" />
    <path d="M12 11v6" />
    <circle cx="12" cy="7.6" r="0.6" fill="currentColor" />
  </svg>
)

export const CheckIcon = () => (
  <svg {...base} width={14} height={14} strokeWidth={3.2}><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
)
