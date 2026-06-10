<svelte:head>
  <title>Shakedown Spins | Record Collection Randomizer</title>
  <meta
    name="description"
    content="Connect Discogs, import a CSV, share stashes with friends, and let Shakedown Spins pick the next record."
  />
</svelte:head>

<script lang="ts">
  const quickSteps = [
    ['Connect', 'Discogs, token, or CSV'],
    ['Load', 'Pick a stash'],
    ['Random', 'Let the receiver choose']
  ];

  const listeningFlow = [
    ['Load', 'Choose Street Feed, My Stash, or Friends Stash.'],
    ['Filter', 'Narrow the mood by genre or decade.'],
    ['Random', 'Press once and let the app pick the next album.'],
    ['Share', 'Send a stash, compare overlap, and spin records you both own.']
  ];

  const features = [
    {
      eyebrow: 'Load',
      title: 'Bring your crate',
      copy: 'Connect Discogs, paste a personal token, or upload a CSV. Private stashes require sign-in; public uploads go to Street Feed.'
    },
    {
      eyebrow: 'Spin',
      title: 'Press Random',
      copy: 'Stop scrolling and let the receiver pick the next album. Filter by genre or decade when the room has a mood.'
    },
    {
      eyebrow: 'Share',
      title: 'Compare collections',
      copy: 'Send a stash to another member, accept friends’ collections, and spin only the records you both own.'
    }
  ];

  const stashModes = [
    ['Street Feed', 'The latest 10 public CSV uploads, ready to sample without signing in.'],
    ['My Stash', 'Your signed-in private record collection, powered by Discogs or CSV.'],
    ['Friends Stash', 'Shared collections you accept from Messages or links, including matching-albums mode.']
  ];

  const installSteps = [
    'Open Safari on your iPhone.',
    'Go to shakedownspins.joekirchner.com.',
    'Tap the Share icon in the menu bar.',
    'Tap Add to Home Screen.',
    'Tap Add and the icon appears on your Home Screen.'
  ];

  const androidSteps = [
    'Open Chrome on your Android device.',
    'Go to shakedownspins.joekirchner.com.',
    'Tap More to the right of the address bar.',
    'Tap Add to home screen, then Create shortcut.',
    'Rename the shortcut if you want, then tap Add.'
  ];

  function scrollToInstall(event: MouseEvent) {
    event.preventDefault();
    document.getElementById('install')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  }
</script>

<main class="landing-page">
  <section class="hero-section" aria-labelledby="landing-title">
    <div class="hero-copy">
      <a class="brand-chip" href="/" aria-label="Open Shakedown Spins app">
        <img src="/landing/shakedown-character.png" alt="" />
        <span>Shakedown Spins</span>
      </a>
      <p class="landing-kicker">A record collection randomizer</p>
      <h1 id="landing-title">Load a stash. Press Random. Let the next record find you.</h1>
      <p class="hero-intro">
        Shakedown Spins turns your Discogs collection, CSV exports, and friends’ shared stashes into a fast listening ritual for vinyl collectors who are done overthinking the next spin.
      </p>
      <div class="hero-actions" aria-label="Primary actions">
        <a class="primary-action" href="/">Start Spinning</a>
        <a class="secondary-action" href="#install" onclick={scrollToInstall}>Add to Home Screen</a>
      </div>
    </div>

    <div class="hero-art" aria-label="Shakedown Spins preview">
      <div class="hero-logo-card">
        <img src="/landing/shakedown-spins-icon.png" alt="Shakedown Spins logo" />
      </div>
      <div class="hero-record-card">
        <span class="record-groove" aria-hidden="true"></span>
        <span>Built for album games (best of 3 rolls), one-button decisions, and shared experiences.</span>
      </div>
    </div>
  </section>

  <section class="quick-strip" aria-label="Quick start">
    {#each quickSteps as step, index}
      <article>
        <span>{index + 1}</span>
        <strong>{step[0]}</strong>
        <p>{step[1]}</p>
      </article>
    {/each}
  </section>

  <section class="screen-section" aria-labelledby="screen-title">
    <div class="section-copy">
      <p class="landing-kicker">Receiver-style listening</p>
      <h2 id="screen-title">Your collection becomes the station.</h2>
      <p>
        The app keeps the action easy: load a stash, narrow the filters, roll a random album, and keep the 5 recent picks visible.
      </p>
    </div>
    <figure class="screen-frame">
      <img src="/landing/app-screen.jpg" alt="Screenshot of the Shakedown Spins randomizer interface" />
    </figure>
  </section>

  <section class="flow-strip" aria-label="How it works">
    {#each listeningFlow as step}
      <article>
        <strong>{step[0]}</strong>
        <p>{step[1]}</p>
      </article>
    {/each}
  </section>

  <section class="feature-grid" aria-label="How Shakedown Spins works">
    {#each features as feature}
      <article class="feature-card">
        <span>{feature.eyebrow}</span>
        <h2>{feature.title}</h2>
        <p>{feature.copy}</p>
      </article>
    {/each}
  </section>

  <section class="stash-section" aria-labelledby="stash-title">
    <div class="section-copy">
      <p class="landing-kicker">Three ways to listen</p>
      <h2 id="stash-title">Choose the shelf you want to spin from.</h2>
    </div>
    <div class="stash-mode-grid">
      {#each stashModes as mode}
        <article class="stash-mode-card">
          <strong>{mode[0]}</strong>
          <p>{mode[1]}</p>
        </article>
      {/each}
    </div>
  </section>

  <section class="compare-section" aria-labelledby="compare-title">
    <div class="section-copy">
      <p class="landing-kicker">Shared listening</p>
      <h2 id="compare-title">Compare collections.</h2>
      <p>
        Load a friend’s stash, switch to Matching Albums, and randomize through only the records you both own.
      </p>
    </div>
    <figure class="compare-frame">
      <img src="/landing/matching-collections-guide.png" alt="Illustration of matching album overlap between two shared record collections" />
    </figure>
  </section>

  <section class="install-section" id="install" aria-labelledby="install-title">
    <div class="install-copy">
      <p class="landing-kicker">Use it like an app</p>
      <h2 id="install-title">Add Shakedown Spins to your Home Screen.</h2>
      <p>
        Shakedown Spins runs in the browser, but you can pin it to your Home Screen for quick access before the next listening session.
      </p>
      <div class="install-platform-grid">
        <article class="install-platform-card">
          <div class="install-platform-copy">
            <h3>iPhone / Safari</h3>
            <ol class="install-steps">
              {#each installSteps as step}
                <li>{step}</li>
              {/each}
            </ol>
            <p class="install-note">
              Don’t see Add to Home Screen? Scroll down, tap Edit Actions, then add it.
            </p>
          </div>
          <figure class="install-poster">
            <img src="/landing/ios-home-screen-guide.png" alt="Illustrated iPhone directions for adding Shakedown Spins to the Home Screen" />
          </figure>
        </article>
        <article class="install-platform-card">
          <div class="install-platform-copy">
            <h3>Android / Chrome</h3>
            <ol class="install-steps">
              {#each androidSteps as step}
                <li>{step}</li>
              {/each}
            </ol>
            <p class="install-note">
              Tip: Shortcuts with the Chrome logo open in Chrome.
            </p>
          </div>
          <figure class="install-poster">
            <img src="/landing/android-home-screen-guide.png" alt="Illustrated Android directions for adding Shakedown Spins to the Home Screen" />
          </figure>
        </article>
      </div>
    </div>
  </section>

  <section class="trust-section" aria-label="Privacy and attribution">
    <article>
      <h2>Privacy-minded by default</h2>
      <p>
        Private stashes stay private unless you share them. Sign in for private stashes and sharing. Public CSV uploads are intentionally added to Street Feed.
      </p>
    </article>
    <article>
      <h2>CSV friendly</h2>
      <p>
        Works best with Discogs exports, but any CSV with Artist and Title columns can load. Download a <a href="/landing/shakedown-spins-sample-stash.csv" download>sample CSV template</a>.
      </p>
    </article>
    <article>
      <h2>Sources and credits</h2>
      <p>
        Album notes and fact snippets may draw from Wikipedia, TheAudioDB, and Discogs data. Third-party content belongs to its respective owners.
      </p>
    </article>
    <article>
      <h2>Open project</h2>
      <p>
        Want the technical notes? Visit the <a href="https://github.com/pelle989/Shakedown-Spins" target="_blank" rel="noreferrer">GitHub README</a>.
      </p>
    </article>
  </section>

  <section class="final-cta" aria-labelledby="final-title">
    <img src="/landing/shakedown-character.png" alt="" />
    <div>
      <p class="landing-kicker">Ready?</p>
      <h2 id="final-title">Stop choosing. Start spinning.</h2>
    </div>
    <div class="final-actions">
      <a class="primary-action" href="/">Open App</a>
      <a class="secondary-action" href="https://github.com/pelle989/Shakedown-Spins" target="_blank" rel="noreferrer">View GitHub</a>
    </div>
  </section>
</main>

<style>
  :global(body) {
    margin: 0;
    background:
      radial-gradient(circle at 18% 8%, rgba(253, 137, 95, 0.22), transparent 28%),
      radial-gradient(circle at 82% 18%, rgba(19, 90, 162, 0.2), transparent 30%),
      linear-gradient(90deg, rgba(71, 31, 14, 0.16), rgba(120, 60, 27, 0.08) 16%, rgba(66, 29, 15, 0.14) 33%, rgba(116, 56, 26, 0.08) 52%, rgba(68, 31, 16, 0.14) 72%, rgba(112, 53, 24, 0.08) 100%),
      linear-gradient(180deg, #7b311b 0%, #5b2415 46%, #28110a 100%);
    color: #f7ead0;
    font-family: "Satoshi", "Avenir Next", "Helvetica Neue", sans-serif;
  }

  :global(*) {
    box-sizing: border-box;
  }

  .landing-page {
    width: min(100%, 1480px);
    margin: 0 auto;
    padding: 24px clamp(16px, 3vw, 34px) 46px;
  }

  .hero-section,
  .screen-section,
  .compare-section,
  .install-section,
  .trust-section,
  .quick-strip,
  .flow-strip,
  .final-cta {
    border: 1px solid rgba(255, 225, 176, 0.14);
    box-shadow:
      inset 0 1px 0 rgba(255, 238, 200, 0.1),
      0 24px 56px rgba(0, 0, 0, 0.28);
  }

  .hero-section {
    display: grid;
    grid-template-columns: minmax(0, 1.05fr) minmax(320px, 0.95fr);
    gap: clamp(24px, 4vw, 56px);
    align-items: center;
    min-height: calc(100svh - 48px);
    padding: clamp(24px, 5vw, 72px);
    border-radius: 42px;
    background:
      linear-gradient(180deg, rgba(255, 246, 222, 0.08), rgba(35, 14, 7, 0.14)),
      linear-gradient(135deg, rgba(30, 14, 8, 0.82), rgba(76, 36, 18, 0.72));
  }

  .brand-chip {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    width: fit-content;
    margin-bottom: 28px;
    padding: 8px 13px 8px 8px;
    border-radius: 999px;
    color: #fff1d2;
    text-decoration: none;
    background: rgba(22, 10, 6, 0.45);
    border: 1px solid rgba(255, 225, 176, 0.16);
  }

  .brand-chip img {
    width: 38px;
    height: 38px;
    object-fit: contain;
  }

  .brand-chip span {
    font-family: "Oswald", "Satoshi", sans-serif;
    font-size: 0.9rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  .landing-kicker {
    margin: 0 0 10px;
    color: rgb(253 137 95);
    font-family: "Oswald", "Satoshi", sans-serif;
    font-size: 0.82rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
  }

  h1,
  h2 {
    margin: 0;
    font-family: "Oswald", "Satoshi", sans-serif;
    line-height: 0.96;
    text-transform: uppercase;
  }

  h1 {
    max-width: 16ch;
    color: #fff1d2;
    font-size: clamp(2rem, 5.5vw, 5.4rem);
    letter-spacing: -0.025em;
  }

  h2 {
    color: #fff1d2;
    font-size: clamp(2.1rem, 5vw, 5.6rem);
    letter-spacing: -0.035em;
  }

  #install-title {
    max-width: 14ch;
    font-size: clamp(1.55rem, 3.4vw, 3.6rem);
  }

  p {
    margin: 0;
  }

  .hero-intro,
  .section-copy p,
  .install-copy > p,
  .trust-section p {
    max-width: 68ch;
    color: rgba(245, 233, 205, 0.88);
    font-size: clamp(1.02rem, 1.5vw, 1.28rem);
    line-height: 1.55;
  }

  .hero-intro {
    margin-top: 24px;
  }

  .hero-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-top: 34px;
  }

  .primary-action,
  .secondary-action {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 58px;
    padding: 0 24px;
    border-radius: 999px;
    font-family: "Oswald", "Satoshi", sans-serif;
    font-size: 1rem;
    letter-spacing: 0.12em;
    text-decoration: none;
    text-transform: uppercase;
    transition:
      transform 160ms ease,
      box-shadow 160ms ease,
      border-color 160ms ease;
  }

  .primary-action {
    color: #fff1d2;
    background: linear-gradient(180deg, #e5533a, #9b1a1f);
    border: 1px solid rgba(255, 201, 163, 0.24);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.24),
      0 16px 24px rgba(66, 15, 8, 0.32);
  }

  .secondary-action {
    color: #f3dfbb;
    background: rgba(20, 10, 6, 0.28);
    border: 1px solid rgba(255, 225, 176, 0.22);
  }

  .primary-action:hover,
  .primary-action:focus-visible,
  .secondary-action:hover,
  .secondary-action:focus-visible {
    transform: translateY(-2px);
    border-color: rgb(253 137 95);
  }

  .hero-art {
    display: grid;
    gap: 18px;
  }

  .quick-strip,
  .flow-strip {
    display: grid;
    gap: 14px;
    margin-top: 22px;
    padding: 14px;
    border-radius: 28px;
    background:
      linear-gradient(180deg, rgba(30, 13, 8, 0.76), rgba(13, 7, 5, 0.88));
  }

  .quick-strip {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .quick-strip article,
  .flow-strip article {
    min-width: 0;
    border: 1px solid rgba(255, 225, 176, 0.14);
    box-shadow: inset 0 1px 0 rgba(255, 238, 200, 0.07);
  }

  .quick-strip article {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 4px 12px;
    align-items: center;
    padding: 14px 16px;
    border-radius: 20px;
    background: rgba(255, 245, 226, 0.06);
  }

  .quick-strip span {
    display: inline-grid;
    grid-row: span 2;
    place-items: center;
    width: 34px;
    height: 34px;
    border-radius: 50%;
    color: #fff1d2;
    background: linear-gradient(180deg, #e5533a, #9b1a1f);
    font-family: "Oswald", "Satoshi", sans-serif;
  }

  .quick-strip strong,
  .flow-strip strong {
    color: #fff1d2;
    font-family: "Oswald", "Satoshi", sans-serif;
    letter-spacing: 0.11em;
    text-transform: uppercase;
  }

  .quick-strip p,
  .flow-strip p {
    color: rgba(245, 233, 205, 0.78);
    font-size: 0.94rem;
    line-height: 1.35;
  }

  .hero-logo-card,
  .hero-record-card,
  .screen-frame,
  .install-poster,
  .feature-card,
  .stash-mode-card {
    background:
      linear-gradient(180deg, rgba(255, 245, 226, 0.98), rgba(255, 225, 176, 0.96));
    color: #2d1e13;
    border: 1px solid rgba(103, 61, 29, 0.16);
  }

  .hero-logo-card {
    display: grid;
    place-items: center;
    min-height: 460px;
    padding: clamp(24px, 4vw, 52px);
    border-radius: 36px;
    overflow: hidden;
  }

  .hero-logo-card img {
    width: min(100%, 500px);
    filter: drop-shadow(0 24px 30px rgba(18, 7, 3, 0.28));
  }

  .hero-record-card {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 14px;
    align-items: center;
    min-height: 104px;
    padding: 18px 22px;
    border-radius: 26px;
    font-weight: 700;
    line-height: 1.3;
  }

  .record-groove {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background:
      radial-gradient(circle, #e5533a 0 14%, #2a140d 15% 23%, #0d0907 24% 100%);
    box-shadow:
      inset 0 0 0 5px rgba(255, 255, 255, 0.06),
      inset 0 0 0 13px rgba(255, 255, 255, 0.035),
      inset 0 0 0 21px rgba(255, 255, 255, 0.025);
  }

  .screen-section,
  .compare-section,
  .install-section {
    display: grid;
    grid-template-columns: minmax(0, 0.8fr) minmax(340px, 1.2fr);
    gap: clamp(20px, 4vw, 44px);
    align-items: center;
    margin-top: 22px;
    padding: clamp(22px, 4vw, 46px);
    border-radius: 34px;
    background: rgba(28, 13, 8, 0.5);
  }

  .section-copy {
    display: grid;
    gap: 16px;
  }

  .screen-frame,
  .compare-frame,
  .install-poster {
    margin: 0;
    padding: 10px;
    border-radius: 26px;
    overflow: hidden;
  }

  .screen-frame img,
  .compare-frame img,
  .install-poster img {
    display: block;
    width: 100%;
    border-radius: 18px;
  }

  .feature-grid,
  .stash-mode-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 14px;
    margin-top: 22px;
  }

  .feature-card,
  .stash-mode-card {
    display: grid;
    gap: 12px;
    min-height: 236px;
    padding: 24px;
    border-radius: 28px;
  }

  .feature-card span {
    width: fit-content;
    padding: 5px 10px;
    border-radius: 999px;
    color: #fff1d2;
    background: linear-gradient(180deg, #e5533a, #9b1a1f);
    font-family: "Oswald", "Satoshi", sans-serif;
    font-size: 0.75rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  .feature-card h2,
  .stash-mode-card strong,
  .trust-section h2,
  .final-cta h2 {
    color: #2d1e13;
    font-family: "Oswald", "Satoshi", sans-serif;
    font-size: clamp(1.45rem, 2.6vw, 2.7rem);
    letter-spacing: -0.02em;
    line-height: 1;
    text-transform: uppercase;
  }

  .feature-card p,
  .stash-mode-card p {
    color: rgba(57, 34, 17, 0.78);
    font-size: 1rem;
    line-height: 1.45;
  }

  .flow-strip {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .flow-strip article {
    display: grid;
    gap: 8px;
    padding: 18px;
    border-radius: 22px;
    background:
      linear-gradient(180deg, rgba(255, 245, 226, 0.1), rgba(98, 38, 18, 0.16));
  }

  .stash-section {
    margin-top: 42px;
  }

  .stash-section .section-copy {
    margin-bottom: 18px;
  }

  .stash-mode-card {
    min-height: 176px;
  }

  .install-section {
    grid-template-columns: 1fr;
    align-items: start;
  }

  .compare-section {
    grid-template-columns: minmax(340px, 1.25fr) minmax(0, 0.75fr);
  }

  .compare-frame {
    order: -1;
    padding: 8px;
    background:
      linear-gradient(180deg, rgba(255, 245, 226, 0.98), rgba(255, 225, 176, 0.96));
  }

  .install-copy {
    display: grid;
    gap: 16px;
  }

  .install-platform-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
  }

  .install-platform-card {
    display: grid;
    align-content: start;
    gap: 16px;
    padding: 16px;
    border-radius: 22px;
    background: rgba(18, 9, 6, 0.34);
    border: 1px solid rgba(255, 225, 176, 0.14);
    box-shadow: inset 0 1px 0 rgba(255, 238, 200, 0.08);
  }

  .install-platform-copy {
    display: grid;
    gap: 13px;
  }

  .install-platform-card h3 {
    margin: 0;
    color: #f3dfbb;
    font-family: "Oswald", "Satoshi", sans-serif;
    font-size: 1rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .install-steps {
    display: grid;
    gap: 10px;
    margin: 4px 0 0;
    padding: 0;
    list-style: none;
    counter-reset: step;
  }

  .install-steps li {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 12px;
    align-items: center;
    color: #fff1d2;
    line-height: 1.35;
    counter-increment: step;
  }

  .install-steps li::before {
    content: counter(step);
    display: inline-grid;
    place-items: center;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    color: #fff1d2;
    background: linear-gradient(180deg, #e5533a, #9b1a1f);
    font-family: "Oswald", "Satoshi", sans-serif;
  }

  .install-note {
    color: rgba(255, 226, 185, 0.78);
    font-size: 0.94rem;
    line-height: 1.45;
  }

  .install-poster {
    padding: 8px;
  }

  .trust-section {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 16px;
    margin-top: 22px;
    padding: clamp(20px, 3vw, 34px);
    border-radius: 30px;
    background: rgba(28, 13, 8, 0.44);
  }

  .trust-section article {
    display: grid;
    gap: 10px;
  }

  .trust-section h2 {
    color: #f3dfbb;
    font-size: 1.25rem;
    letter-spacing: 0.05em;
  }

  .trust-section p,
  .trust-section a {
    color: rgba(245, 233, 205, 0.82);
    font-size: 0.96rem;
    line-height: 1.5;
  }

  .trust-section a {
    text-decoration-color: rgb(253 137 95);
    text-underline-offset: 0.2em;
  }

  .final-cta {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    gap: 18px;
    align-items: center;
    margin-top: 22px;
    padding: 22px;
    border-radius: 30px;
    background:
      linear-gradient(180deg, rgba(255, 245, 226, 0.98), rgba(255, 225, 176, 0.96));
    color: #2d1e13;
  }

  .final-cta img {
    width: 72px;
    height: 72px;
    object-fit: contain;
  }

  .final-cta .landing-kicker {
    margin-bottom: 4px;
  }

  .final-cta .primary-action {
    min-height: 50px;
  }

  .final-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    justify-content: end;
  }

  .final-actions .primary-action,
  .final-actions .secondary-action {
    min-height: 50px;
  }

  @media (max-width: 980px) {
    .hero-section,
    .screen-section,
    .compare-section,
    .install-section,
    .trust-section,
    .quick-strip,
    .flow-strip,
    .final-cta {
      grid-template-columns: 1fr;
    }

    .hero-section {
      min-height: auto;
    }

    .feature-grid,
    .stash-mode-grid,
    .quick-strip,
    .flow-strip {
      grid-template-columns: 1fr;
    }

    .feature-card,
    .stash-mode-card {
      min-height: auto;
    }

    .final-cta {
      justify-items: start;
    }

    .final-actions {
      justify-content: start;
    }
  }

  @media (max-width: 620px) {
    .landing-page {
      padding: 12px 10px 28px;
    }

    .hero-section,
    .screen-section,
    .compare-section,
    .install-section,
    .trust-section,
    .quick-strip,
    .flow-strip,
    .final-cta {
      border-radius: 24px;
    }

    .hero-section {
      padding: 20px;
    }

    h1 {
      font-size: clamp(1.8rem, 9vw, 2.7rem);
    }

    .hero-logo-card {
      min-height: 260px;
      border-radius: 24px;
    }

    .hero-actions,
    .primary-action,
    .secondary-action {
      width: 100%;
    }

    .screen-section,
    .compare-section,
    .install-section {
      padding: 16px;
    }

    .install-platform-grid {
      grid-template-columns: 1fr;
    }

    .trust-section,
    .quick-strip,
    .flow-strip,
    .final-cta {
      padding: 18px;
    }

    .final-actions,
    .final-actions .primary-action,
    .final-actions .secondary-action {
      width: 100%;
    }
  }
</style>
