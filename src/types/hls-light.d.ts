// The light build has the same API (minus EME, alt-audio and subtitle features we don't use) but ships no typings
declare module 'hls.js/light' {
  export * from 'hls.js'
  export { default } from 'hls.js'
}
