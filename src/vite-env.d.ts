/// <reference types="vite/client" />

declare module '*.mdx' {
  import type { ComponentType } from 'react'
  export const frontmatter: {
    title: string
    subtitle: string
    date: string
    readTime: string
    category: string
    image: string
    author: {
      name: string
      avatar: string
    }
  }
  const component: ComponentType
  export default component
}
