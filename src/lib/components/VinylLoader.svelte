<script context="module" lang="ts">
  let vinylLoaderId = 0;
</script>

<script lang="ts">
  export let active = false;
  export let animated = true;
  export let size = 64;

  const clipId = `vinyl-label-clip-${++vinylLoaderId}`;
</script>

<svg
  class:active
  class:static-loader={!animated}
  class="record-loader"
  width={size}
  height={size}
  viewBox="0 0 100 100"
  aria-hidden="true"
>
  <defs>
    <clipPath id={clipId}>
      <circle cx="50" cy="50" r="16.2" />
    </clipPath>
  </defs>
  <g class:active class="record-disc">
    <circle class="record" cx="50" cy="50" r="48" />
    <circle class="groove groove-a" cx="50" cy="50" r="34" />
    <circle class="groove groove-b" cx="50" cy="50" r="26" />
    <circle class="groove groove-c" cx="50" cy="50" r="18" />
    <circle class="label" cx="50" cy="50" r="17" />
    <image
      class="label-art"
      href="/shakedown-spins.png"
      x="33.8"
      y="33.8"
      width="32.4"
      height="32.4"
      preserveAspectRatio="xMidYMid slice"
      clip-path={`url(#${clipId})`}
    />
    <circle class="label-ring" cx="50" cy="50" r="16.5" />
    <circle class="accent" cx="50" cy="50" r="3" />
    <circle class="hole" cx="50" cy="50" r="2.4" />
  </g>
</svg>

<style>
  .record-loader {
    display: block;
    max-width: 100%;
    max-height: 100%;
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

  .record-loader.static-loader,
  .record-loader.static-loader.active {
    animation: none;
    filter: drop-shadow(0 8px 12px rgba(0, 0, 0, 0.2));
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

  .record-loader.static-loader .record-disc,
  .record-loader.static-loader .record-disc.active,
  .record-loader.static-loader .groove-a,
  .record-loader.static-loader .groove-b,
  .record-loader.static-loader .groove-c {
    animation: none;
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

  .label-art {
    opacity: 0.98;
    transform-origin: 50% 50%;
  }

  .label-ring {
    fill: none;
    stroke: rgba(255, 245, 222, 0.55);
    stroke-width: 0.7;
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
