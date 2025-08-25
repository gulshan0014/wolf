'use client'

import { useEffect } from 'react'

export default function RemoveInjectedAttrs() {
  useEffect(() => {
    try {
      const attrs = ['data-new-gr-c-s-check-loaded', 'data-gr-ext-installed']
      attrs.forEach(attr => {
        if (document.documentElement.hasAttribute(attr)) document.documentElement.removeAttribute(attr)
        if (document.body.hasAttribute(attr)) document.body.removeAttribute(attr)
      })
    } catch (e) {
      // ignore
    }
  }, [])

  return null
}
