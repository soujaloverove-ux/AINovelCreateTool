import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/Home.vue'),
  },
  {
    path: '/novels',
    name: 'NovelList',
    component: () => import('@/views/novel/NovelList.vue'),
  },
  {
    path: '/novels/create',
    name: 'NovelCreate',
    component: () => import('@/views/novel/NovelCreate.vue'),
  },
  {
    path: '/tasks',
    name: 'TaskCenter',
    component: () => import('@/views/TaskCenter.vue'),
  },
  {
    path: '/settings/prompts',
    name: 'PromptManagement',
    component: () => import('@/views/settings/PromptManagement.vue'),
  },
  {
    path: '/settings/providers',
    name: 'ProviderManagement',
    component: () => import('@/views/settings/ProviderManagement.vue'),
  },
  {
    path: '/novels/:id',
    component: () => import('@/layouts/NovelWorkspaceLayout.vue'),
    children: [
      {
        path: '',
        redirect: (to) => `/novels/${to.params.id}/overview`,
      },
      {
        path: 'overview',
        name: 'NovelOverview',
        component: () => import('@/views/novel/NovelOverview.vue'),
      },
      {
        path: 'characters',
        name: 'NovelCharacters',
        component: () => import('@/views/novel/NovelCharacters.vue'),
      },
      {
        path: 'world',
        name: 'NovelWorld',
        component: () => import('@/views/novel/NovelWorld.vue'),
      },
      {
        path: 'outline',
        name: 'NovelOutline',
        component: () => import('@/views/novel/NovelOutline.vue'),
      },
      {
        path: 'chapters',
        name: 'NovelChapters',
        component: () => import('@/views/novel/NovelChapters.vue'),
      },
      {
        path: 'read',
        name: 'NovelRead',
        component: () => import('@/views/novel/NovelRead.vue'),
      },
      {
        path: 'continuation',
        name: 'NovelContinuation',
        component: () => import('@/views/novel/NovelContinuation.vue'),
      },
      {
        path: 'settings',
        name: 'NovelSettings',
        component: () => import('@/views/novel/NovelSettings.vue'),
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/NotFound.vue'),
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
