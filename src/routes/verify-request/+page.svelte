<svelte:head>
  <title>Check Your Inbox • Shakedown Spins</title>
  <meta
    name="description"
    content="Your Shakedown Spins magic link is on the way. Open the email we sent to continue."
  />
</svelte:head>

<script lang="ts">
  import VinylLoader from '$lib/components/VinylLoader.svelte';
</script>

<div class="verify-page">
  <div class="verify-card">
    <span class="verify-kicker">Magic Link Sent</span>
    <h1>Check your inbox.</h1>
    <p>
      Your Shakedown Spins sign-in link is on the way. Open the email we sent and tap the link to
      head back into My Stash.
    </p>
    <div class="verify-loader">
      <VinylLoader size={150} active={true} />
    </div>
    <p class="verify-note">
      Didn’t see it?<br />
      Check spam or request a fresh magic link from the main app screen.
    </p>
    <a class="verify-link" href="/">Back to Shakedown Spins</a>
  </div>
</div>

<style>
  :global(body) {
    margin: 0;
    min-height: 100vh;
    background:
      linear-gradient(180deg, rgba(255, 232, 187, 0.06), transparent 18%),
      linear-gradient(90deg, rgba(71, 31, 14, 0.16), rgba(120, 60, 27, 0.08) 16%, rgba(66, 29, 15, 0.14) 33%, rgba(116, 56, 26, 0.08) 52%, rgba(68, 31, 16, 0.14) 72%, rgba(112, 53, 24, 0.08) 100%),
      linear-gradient(180deg, #7b311b 0%, #6a2917 24%, #5b2415 48%, #4a1d12 72%, #38160e 100%);
    color: #f7ead0;
    font-family: Georgia, serif;
  }

  .verify-page {
    min-height: 100vh;
    display: grid;
    place-items: center;
    padding: 24px;
  }

  .verify-card {
    width: min(100%, 560px);
    display: grid;
    gap: 18px;
    padding: 28px 26px;
    border-radius: 26px;
    background:
      linear-gradient(180deg, rgba(255, 236, 198, 0.08), rgba(31, 14, 8, 0.26)),
      linear-gradient(180deg, #3a2013 0%, #21120c 100%);
    border: 1px solid rgba(255, 225, 176, 0.14);
    box-shadow:
      inset 0 1px 0 rgba(255, 238, 200, 0.08),
      0 24px 54px rgba(0, 0, 0, 0.34);
    text-align: center;
  }

  .verify-kicker {
    color: rgba(252, 137, 95, 0.9);
    font-family: Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif;
    font-size: 3.86em;
    letter-spacing: 0.22em;
    text-transform: uppercase;
  }

  h1 {
    margin: 0;
    font-family: Arial, sans-serif;
    font-size: clamp(2.2rem, 5vw, 3rem);
    line-height: 1;
    color: #fff1d2;
  }

  p {
    margin: 0;
    font-size: 1.02rem;
    line-height: 1.6;
    color: #dbc8a4;
  }

  .verify-loader {
    display: grid;
    place-items: center;
    padding: 8px 0;
  }

  .verify-note {
    font-size: 0.94rem;
    color: #c8b08a;
  }

  .verify-link {
    justify-self: center;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 210px;
    padding: 14px 22px;
    border-radius: 999px;
    text-decoration: none;
    background:
      linear-gradient(180deg, #f3dfab 0%, #e7c882 100%);
    border: 2px solid rgb(253 137 95);
    color: #7f1f1f;
    font-family: Arial, sans-serif;
    font-size: 0.9rem;
    font-weight: 700;
    line-height: 1;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    white-space: nowrap;
    transition:
      transform 160ms ease,
      box-shadow 160ms ease,
      border-color 160ms ease,
      background 160ms ease;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.34),
      0 10px 20px rgba(38, 15, 7, 0.16);
  }

  .verify-link:hover,
  .verify-link:focus-visible {
    font-family: Arial, sans-serif;
    font-size: 0.9rem;
    font-weight: 700;
    line-height: 1;
    letter-spacing: 0.06em;
    transform: none;
    background:
      linear-gradient(180deg, #f6e5b8 0%, #ebcf8c 100%);
    border-color: rgb(255 154 118);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.34),
      0 12px 22px rgba(38, 15, 7, 0.2);
  }
</style>
