// React 19 no longer exposes JSX namespace globally.
// This declaration restores it for components that reference JSX.Element.
/// <reference types="react" />

declare global {
  namespace JSX {
    type Element = React.JSX.Element;
    type IntrinsicElements = React.JSX.IntrinsicElements;
  }
}

export {};
