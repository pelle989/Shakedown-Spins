import type {
  Album,
  FeedData,
  LoadedSharedSource,
  MemberMessageSummary,
  SharedOverlapCollection,
  SharedOwnerProfile,
  UserProfileSettings,
  UserUiPreferences
} from '$lib/types';

const fixtureOwner: SharedOwnerProfile = {
  publicProfileName: 'Receiver Jack',
  displayName: 'Jack Kirchner',
  handle: 'jack-kirchner'
};

const fixtureAlbumA: Album = {
  id: 'fixture-album-a',
  artist: 'The Grateful Dead',
  title: 'Workingman’s Dead',
  year: 1970,
  genre: ['Rock']
};

const fixtureAlbumB: Album = {
  id: 'fixture-album-b',
  artist: 'Miles Davis',
  title: 'Bitches Brew',
  year: 1970,
  genre: ['Jazz']
};

const fixtureSharedSource: LoadedSharedSource = {
  id: 'fixture-shared-source',
  name: 'Jack’s Sunday Stack',
  albumCount: 2,
  updatedAt: '2026-05-18T12:00:00.000Z',
  createdAt: '2026-05-17T12:00:00.000Z',
  kind: 'csv',
  visibility: 'shared',
  syncStatus: 'ready',
  owner: fixtureOwner,
  albums: [fixtureAlbumA, fixtureAlbumB]
};

const fixtureSharedOverlap: SharedOverlapCollection = {
  id: 'fixture-overlap',
  name: 'My Stash × Jack’s Sunday Stack',
  albumCount: 1,
  mineSourceId: 'fixture-private-source',
  mineSourceName: 'My Listening Room',
  sharedSourceId: fixtureSharedSource.id,
  sharedSourceName: fixtureSharedSource.name,
  sharedOwner: fixtureOwner,
  albums: [fixtureAlbumA]
};

const fixtureProfile: UserProfileSettings = {
  publicProfileName: 'Demo Listener',
  displayName: 'Demo Listener',
  handle: 'demo-listener',
  email: 'demo@example.com'
};

const fixturePreferences: UserUiPreferences = {
  welcomeSeen: true,
  friendLoadModes: {},
  friendShelfSources: {}
};

export function getRootPageFixture(
  fixtureName: string
): (FeedData & {
  initialSharedSource?: LoadedSharedSource | null;
  initialSharedOverlap?: SharedOverlapCollection | null;
  currentUserProfile?: UserProfileSettings | null;
  uiPreferences?: UserUiPreferences | null;
  discogsConnection: null;
  databaseAvailable: boolean;
}) | null {
  if (fixtureName === 'shared-link') {
    return {
      stashes: [],
      mySources: [],
      friendStashes: [],
      memberMessages: [],
      unreadMessageCount: 0,
      discogsConnection: null,
      databaseAvailable: true,
      currentUserProfile: null,
      uiPreferences: null,
      initialSharedSource: fixtureSharedSource,
      initialSharedOverlap: null
    };
  }

  if (fixtureName === 'shared-overlap') {
    return {
      stashes: [],
      mySources: [],
      friendStashes: [],
      memberMessages: [],
      unreadMessageCount: 0,
      discogsConnection: null,
      databaseAvailable: true,
      currentUserProfile: fixtureProfile,
      uiPreferences: fixturePreferences,
      initialSharedSource: fixtureSharedSource,
      initialSharedOverlap: fixtureSharedOverlap
    };
  }

  return null;
}

export function getMessagesFixture(): {
  messages: MemberMessageSummary[];
  owner: SharedOwnerProfile;
} {
  const messages: MemberMessageSummary[] = Array.from({ length: 6 }, (_, index) => ({
    id: `fixture-message-${index + 1}`,
    direction: 'inbox',
    body: index === 0 ? 'Start with this one when the room is quiet.' : undefined,
    createdAt: `2026-05-${String(10 + index).padStart(2, '0')}T12:00:00.000Z`,
    readAt: index < 2 ? undefined : '2026-05-18T12:00:00.000Z',
    sender: fixtureOwner,
    recipient: fixtureProfile,
    sharedSource:
      index < 5
        ? {
            id: `${fixtureSharedSource.id}-${index + 1}`,
            name: `${fixtureSharedSource.name} ${index + 1}`,
            owner: fixtureOwner
          }
        : null
  }));

  return {
    messages,
    owner: fixtureOwner
  };
}
