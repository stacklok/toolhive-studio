import type { SVGProps } from 'react'

export const IllustrationClock = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 136 136"
    fill="none"
    {...props}
  >
    <circle cx={68} cy={68} r={45} fill="var(--background)" />
    <path
      fill="transparent"
      fillRule="evenodd"
      d="m43.804 40.009-.312.271C35.831 47.059 31 56.965 31 68c0 20.435 16.566 37 37 37 11.54 0 21.845-5.283 28.63-13.561 1.93.261 3.891.433 5.875.512C94.921 102.859 82.295 110 68 110c-23.196 0-42-18.804-42-42 0-13.891 6.744-26.207 17.136-33.853.131 1.981.355 3.937.668 5.862z"
      clipRule="evenodd"
    />
    <path
      stroke="var(--muted-foreground)"
      strokeWidth={2.5}
      d="M68 102c18.778 0 34-15.222 34-34S86.778 34 68 34 34 49.222 34 68s15.222 34 34 34z"
    />
    <path
      stroke="var(--muted-foreground)"
      strokeLinecap="round"
      strokeWidth={2.5}
      d="M40.893 103.922a44.795 44.795 0 0 0 3.039 2.107m2.957 1.722A44.807 44.807 0 0 0 68 113c24.853 0 45-20.147 45-45S92.853 23 68 23 23 43.147 23 68c0 13.35 5.813 25.34 15.045 33.582"
    />
    <path
      fill="transparent"
      fillRule="evenodd"
      d="M66 63.75a4.25 4.25 0 1 0 0 8.5 4.25 4.25 0 0 0 0-8.5zm3.485 5.976.102.091 8.797 8.8a1.25 1.25 0 0 1-1.666 1.858l-.102-.091-8.797-8.8a1.25 1.25 0 0 1 1.666-1.858zM66 66.25a1.75 1.75 0 1 1 0 3.5 1.75 1.75 0 0 1 0-3.5zm0-25.624c.647 0 1.18.492 1.243 1.122l.007.128V65a1.25 1.25 0 0 1-2.493.128L64.75 65V41.876c0-.69.56-1.25 1.25-1.25z"
      clipRule="evenodd"
    />
    <path
      fill="var(--background)"
      stroke="var(--muted-foreground)"
      strokeWidth={2.5}
      d="M68 70a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"
    />
    <path
      stroke="var(--muted-foreground)"
      strokeLinecap="round"
      strokeWidth={2.5}
      d="M68 64V40.876M79.5 78.5l-8.797-8.8"
    />
    <path
      stroke="var(--muted-foreground)"
      strokeLinecap="round"
      strokeWidth={2.5}
      d="M68.5 96.5v-7M40 68h7m42 0h7m-7.347 20.153-4.95-4.95M53.297 52.797l-4.95-4.95m0 40.306 4.95-4.95m30.406-30.406 4.95-4.95"
    />
  </svg>
)
