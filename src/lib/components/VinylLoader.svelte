<script lang="ts">
  export let active = false;
  export let size = 64;
</script>

<svg
  class:active
  class="record-loader"
  width={size}
  height={size}
  viewBox="0 0 100 100"
  aria-hidden="true"
>
  <g class:active class="record-disc">
    <circle class="record" cx="50" cy="50" r="48" />
    <circle class="groove groove-a" cx="50" cy="50" r="34" />
    <circle class="groove groove-b" cx="50" cy="50" r="26" />
    <circle class="groove groove-c" cx="50" cy="50" r="18" />
    <circle class="label" cx="50" cy="50" r="17" />
    <path class="label-band" d="M39 42 C46 38, 56 38, 63 42 L63 47 C56 44, 46 44, 39 47 Z" />
    <circle class="label-sticker" cx="58" cy="45" r="3.4" />
    <path class="label-mark" d="M50 33 L53 39 L47 39 Z" />
    <circle class="accent" cx="50" cy="50" r="7" />
    <circle class="hole" cx="50" cy="50" r="2.4" />
  </g>
</svg>

<style>
  .record-loader {
    transform-origin: 50% 50%;
    transform-box: fill-box;
    animation:
      loader-breathe 2.4s ease-in-out infinite,
      loader-wobble 2.8s ease-in-out infinite;
    filter: drop-shadow(0 8px 12px rgba(0, 0, 0, 0.2));
    will-change: transform, filter;
  }

  .record-loader.active {
    animation:
      loader-breathe 1.1s ease-in-out infinite,
      loader-wobble 1.6s ease-in-out infinite;
  }

  .record-disc {
    transform-origin: 50% 50%;
    transform-box: fill-box;
    animation: spin 10s linear infinite;
    will-change: transform;
  }

  .record-disc.active {
    animation-duration: 1.4s;
  }

  .record {
    fill: #120d0a;
    stroke: rgba(255, 255, 255, 0.08);
    stroke-width: 1;
  }

  .groove {
    fill: none;
    stroke: rgba(255, 255, 255, 0.08);
    stroke-width: 1;
  }

  .groove-a {
    animation: groove-flicker 2.8s ease-in-out infinite;
  }

  .groove-b {
    animation: groove-flicker 2.8s ease-in-out infinite 0.18s;
  }

  .groove-c {
    animation: groove-flicker 2.8s ease-in-out infinite 0.36s;
  }

  .label {
    fill: var(--color-paper);
  }

  .label-band {
    fill: rgba(122, 63, 44, 0.34);
  }

  .label-sticker {
    fill: #d35d3a;
    stroke: rgba(95, 40, 23, 0.35);
    stroke-width: 0.8;
  }

  .label-mark {
    fill: rgba(91, 52, 31, 0.8);
  }

  .accent {
    fill: var(--color-accent);
  }

  .hole {
    fill: #20150f;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }

    to {
      transform: rotate(360deg);
    }
  }

  @keyframes loader-breathe {
    0%,
    100% {
      filter: drop-shadow(0 8px 12px rgba(0, 0, 0, 0.2));
    }

    50% {
      filter: drop-shadow(0 12px 18px rgba(0, 0, 0, 0.26));
    }
  }

  @keyframes loader-wobble {
    0%,
    100% {
      transform: rotate(0deg) scale(1);
    }

    25% {
      transform: rotate(1.2deg) scale(1.01);
    }

    50% {
      transform: rotate(0deg) scale(0.995);
    }

    75% {
      transform: rotate(-1.2deg) scale(1.01);
    }
  }

  @keyframes groove-flicker {
    0%,
    100% {
      stroke: rgba(255, 255, 255, 0.08);
    }

    50% {
      stroke: rgba(255, 255, 255, 0.16);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .record-loader,
    .record-loader.active,
    .record-disc,
    .record-disc.active {
      animation: none;
      opacity: 0.85;
    }
  }
</style>
