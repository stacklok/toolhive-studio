import type { SVGProps } from 'react'

export const IllustrationCalendar = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 136 136"
    fill="none"
    {...props}
  >
    <rect
      width={81}
      height={76}
      x={27.5}
      y={32.375}
      fill="var(--background)"
      rx={7}
    />
    <path
      stroke="var(--ring)"
      strokeLinecap="round"
      strokeWidth={2.5}
      d="M101.395 32.623h2.95c1.822 0 3.298 1.46 3.298 3.26v68.458c0 1.801-1.476 3.26-3.298 3.26H31.798c-1.822 0-3.298-1.459-3.298-3.26V35.883c0-1.8 1.476-3.26 3.298-3.26h2.933m16.679 0h33.323"
    />
    <path
      fill="var(--muted)"
      fillRule="evenodd"
      d="m103 89.875.495-.004v11.982a2 2 0 0 1-2 2h-67.3a2 2 0 0 1-2-2v-46.5a2 2 0 0 1 2-2l9.43.001C54.586 75.021 77.058 89.875 103 89.875z"
      clipRule="evenodd"
    />
    <path
      stroke="var(--border)"
      strokeLinejoin="round"
      strokeWidth={2.5}
      d="M50.41 59.699H39.914a1 1 0 0 0-1 1v10.496a1 1 0 0 0 1 1H50.41a1 1 0 0 0 1-1V60.699a1 1 0 0 0-1-1zm22.91 0H62.823a1 1 0 0 0-1 1v10.496a1 1 0 0 0 1 1H73.32a1 1 0 0 0 1-1V60.699a1 1 0 0 0-1-1zM50.41 82.691H39.914a1 1 0 0 0-1 1v10.496a1 1 0 0 0 1 1H50.41a1 1 0 0 0 1-1V83.691a1 1 0 0 0-1-1zm22.91 0H62.823a1 1 0 0 0-1 1v10.496a1 1 0 0 0 1 1H73.32a1 1 0 0 0 1-1V83.691a1 1 0 0 0-1-1zm22.91-22.992H85.733a1 1 0 0 0-1 1v10.496a1 1 0 0 0 1 1H96.23a1 1 0 0 0 1-1V60.699a1 1 0 0 0-1-1z"
    />
    <path
      stroke="var(--ring)"
      strokeLinecap="round"
      strokeWidth={2.5}
      d="M30.13 49.285h64.128m-64.128 0H98.5M43.079 37.622v-9.997m49.985 9.997v-9.997"
    />
    <path
      fill="var(--muted)"
      fillRule="evenodd"
      d="M38.914 37.579a3.793 3.793 0 0 0 3.598 3.788l.195.005h.913a3.793 3.793 0 0 0 3.789-3.598l.005-.195c0-.896.726-1.623 1.622-1.623H87.29c.896 0 1.623.727 1.623 1.623a3.793 3.793 0 0 0 3.598 3.788l.195.005h.913a3.793 3.793 0 0 0 3.789-3.598l.005-.195c0-.896.726-1.623 1.622-1.623h2.765a2 2 0 0 1 2 2v7.666H32.195v-7.666a2 2 0 0 1 2-2h3.096c.896 0 1.623.727 1.623 1.623z"
      clipRule="evenodd"
    />
  </svg>
)
