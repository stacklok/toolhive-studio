import type { SVGProps } from 'react'

export const IllustrationAlert = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 136 136"
    fill="none"
    {...props}
  >
    <path
      fill="var(--background)"
      fillRule="evenodd"
      d="M27.477 103.241h-4.52a4 4 0 0 1-3.387-6.128l39.255-62.481a4 4 0 0 1 6.774 0l39.256 62.48a4.001 4.001 0 0 1-3.387 6.129H27.476zm9.374 0h-5.592 5.592z"
      clipRule="evenodd"
    />
    <path
      stroke="var(--ring)"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2.5}
      d="M36.85 103.241h-5.59m-3.783 0h-4.52a4 4 0 0 1-3.387-6.128l39.255-62.481a4 4 0 0 1 6.774 0l39.256 62.48a4 4 0 0 1-3.387 6.129H27.476z"
    />
    <path
      fill="var(--muted)"
      fillRule="evenodd"
      d="m93.276 85.971 7.574 12.244a1 1 0 0 1-.85 1.526H24.425a1 1 0 0 1-.85-1.526l22.353-36.143c11.087 14.397 28.16 23.691 47.348 23.9z"
      clipRule="evenodd"
    />
    <path
      fill="var(--muted)"
      stroke="var(--ring)"
      strokeLinecap="round"
      strokeWidth={2.5}
      d="M65.463 77.86v-22a3.25 3.25 0 0 0-6.5 0v22a3.25 3.25 0 1 0 6.5 0zm-3.251 14.75a3.25 3.25 0 1 0 0-6.5 3.25 3.25 0 0 0 0 6.5z"
    />
    <path
      stroke="var(--border)"
      strokeWidth={2}
      d="M93.064 46.013a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"
    />
    <path
      fill="var(--border)"
      d="M117.873 57.283a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"
    />
    <path
      stroke="var(--border)"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2.5}
      d="m96.418 59.161 8.358 8.358m.127-8.358-8.358 8.358 8.358-8.358zm-89.776 6.314 6 6m0-6-6 6 6-6z"
    />
    <path
      fill="var(--border)"
      d="M28.723 58.879a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"
    />
  </svg>
)
