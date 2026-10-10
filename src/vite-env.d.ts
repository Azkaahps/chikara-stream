/// <reference types="vite/client" />

declare module '*.css' {
  const content: string;
  export default content;
}

// hls.js ships its light build without dedicated type declarations;
// it exposes the same API surface as the main entry point.
declare module 'hls.js/light' {
  import Hls from 'hls.js';
  export default Hls;
  export * from 'hls.js';
}
