import type { SVGProps } from 'react'

export const IllustrationCreditCard = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 136 136"
    fill="none"
    {...props}
  >
    <path
      fill="var(--background)"
      fillRule="evenodd"
      d="M16.864 43.143 99.89 29.85a3 3 0 0 1 3.437 2.488l.001.01 8.122 51.832a3 3 0 0 1-2.49 3.427l-83.024 13.291a3 3 0 0 1-3.438-2.498l-8.123-51.83a3 3 0 0 1 2.49-3.426z"
      clipRule="evenodd"
    />
    <path
      stroke="var(--ring)"
      strokeLinecap="round"
      strokeWidth={2.5}
      d="m30.257 100.048-3.184.525c-2.186.36-4.24-1.192-4.586-3.467l-7.525-49.442c-.346-2.275 1.145-4.412 3.332-4.773L98.47 29.677c2.187-.36 4.24 1.192 4.587 3.468l.806 5.3m.572 3.756.477 3.133"
    />
    <path
      fill="var(--muted)"
      fillRule="evenodd"
      d="m20.889 45.417 75.76-11.831a3 3 0 0 1 3.425 2.488l7.36 45.82a3 3 0 0 1-2.486 3.437l-.013.002-75.76 11.831a3 3 0 0 1-3.425-2.488l-7.36-45.82a3 3 0 0 1 2.486-3.437l.013-.002z"
      clipRule="evenodd"
    />
    <path
      fill="var(--background)"
      stroke="var(--ring)"
      strokeWidth={2.5}
      d="M117.662 49.875h-78.5a4 4 0 0 0-4 4v48.5a4 4 0 0 0 4 4h78.5a4 4 0 0 0 4-4v-48.5a4 4 0 0 0-4-4z"
    />
    <path fill="var(--muted)" d="M120.412 61.625h-84v14h84v-14z" />
    <path
      stroke="var(--ring)"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2.5}
      d="M50.2 61.625h-7.196m78.079 0h-65.84 65.84zm-6 13h-78.84 78.84zm-43.109 19H43.666h28.308z"
    />
  </svg>
)
