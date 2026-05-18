<script lang="ts">
  let {
    error,
    status
  }: {
    error: App.Error & { message: string };
    status: number;
  } = $props();
</script>

<svelte:head>
  <title>Shared Collection Unavailable • Shakedown Spins</title>
</svelte:head>

<div class="shared-error-page">
  <article class="shared-error-card">
    <span class="shared-error-kicker">{status === 404 ? 'Shared Link Missing' : 'Shared Link Error'}</span>
    <h1>{status === 404 ? 'That shared collection is no longer in the room.' : 'The shared collection could not be opened.'}</h1>
    <p>{error.message || 'Try heading back to the main room and loading a different shared stash.'}</p>
    <a class="shared-error-link" href="/">Back to Shakedown Spins</a>
  </article>
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

  .shared-error-page {
    min-height: 100vh;
    display: grid;
    place-items: center;
    padding: 28px 18px;
  }

  .shared-error-card {
    width: min(100%, 720px);
    display: grid;
    gap: 18px;
    padding: 30px 28px;
    border-radius: 26px;
    background:
      linear-gradient(180deg, rgba(255, 236, 198, 0.08), rgba(31, 14, 8, 0.26)),
      linear-gradient(180deg, #3a2013 0%, #21120c 100%);
    border: 1px solid rgba(255, 225, 176, 0.14);
    box-shadow:
      inset 0 1px 0 rgba(255, 238, 200, 0.08),
      0 24px 54px rgba(0, 0, 0, 0.28);
  }

  .shared-error-kicker {
    font-family: var(--font-display, Oswald, sans-serif);
    font-size: 0.86rem;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: rgba(252, 137, 95, 0.9);
  }

  h1 {
    margin: 0;
    font-family: var(--font-ui, Arial, sans-serif);
    font-size: clamp(2rem, 4vw, 2.8rem);
    line-height: 1.04;
  }

  p {
    margin: 0;
    color: #dbc8a4;
    font-size: 1rem;
    line-height: 1.55;
  }

  .shared-error-link {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: fit-content;
    min-height: 54px;
    padding: 0 20px;
    border-radius: 999px;
    background:
      radial-gradient(circle at 50% 18%, rgba(255, 204, 157, 0.34), transparent 48%),
      linear-gradient(180deg, rgba(255, 118, 64, 0.96), rgba(196, 34, 22, 0.94));
    color: #ffe6b7;
    border: 1px solid rgba(78, 47, 28, 0.72);
    font-family: var(--font-display, Oswald, sans-serif);
    font-size: 0.9rem;
    letter-spacing: 0.08em;
    text-decoration: none;
    text-transform: uppercase;
    box-shadow:
      inset 0 2px 0 rgba(255, 233, 214, 0.2),
      inset 0 -2px 0 rgba(90, 14, 8, 0.28),
      0 20px 28px rgba(44, 8, 4, 0.2);
  }
</style>
