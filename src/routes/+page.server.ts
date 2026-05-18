import { listStashes } from '$lib/db';
import { listDiscogsConnection } from '$lib/server/discogs';
import { listMemberMessages } from '$lib/server/messages';
import { getUserProfileSettings } from '$lib/server/profile';
import { getUserUiPreferences } from '$lib/server/ui-preferences';
import {
  ensureSharedSourceAccess,
  getSharedOverlapCollection,
  getSharedSource,
  listAccessibleSharedSources,
  listUserSources
} from '$lib/server/sources';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
  const feed = await listStashes();
  const session = await event.locals.auth();
  const userId = session?.user?.id ?? null;
  const sharedSourceId = event.url.searchParams.get('sharedSource');
  const mineSourceId = event.url.searchParams.get('mineSource');
  const initialSharedSource = sharedSourceId ? await getSharedSource(sharedSourceId) : null;

  if (userId && initialSharedSource) {
    await ensureSharedSourceAccess({
      userId,
      sourceId: initialSharedSource.id
    });
  }

  const [mySources, discogsConnection, currentUserProfile, uiPreferences, friendStashes, memberMessageState] = userId
    ? await Promise.all([
        listUserSources(userId),
        listDiscogsConnection(userId),
        getUserProfileSettings(userId),
        getUserUiPreferences(userId),
        listAccessibleSharedSources(userId),
        listMemberMessages(userId)
      ])
    : [[], null, null, null, [], { messages: [], unreadCount: 0 }];

  const initialSharedOverlap =
    userId && sharedSourceId && mineSourceId
      ? await getSharedOverlapCollection({
          userId,
          sharedSourceId,
          mineSourceId
        })
      : null;

  return {
    ...feed,
    mySources,
    friendStashes,
    memberMessages: memberMessageState.messages,
    unreadMessageCount: memberMessageState.unreadCount,
    discogsConnection,
    currentUserProfile,
    uiPreferences,
    initialSharedSource,
    initialSharedOverlap
  };
};
