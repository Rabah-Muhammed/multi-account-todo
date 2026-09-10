from rest_framework import status
from rest_framework.test import APITestCase
from core.authentication import AuthenticatedUser
from todos.models import Account, Todo


class TodoAPITests(APITestCase):
    def setUp(self):
        self.account_a = Account.objects.create(
            auth0_user_id='auth0|user_a',
            email='user_a@example.com'
        )
        self.user_a = AuthenticatedUser(self.account_a, {'sub': 'auth0|user_a'})

        self.account_b = Account.objects.create(
            auth0_user_id='auth0|user_b',
            email='user_b@example.com'
        )
        self.user_b = AuthenticatedUser(self.account_b, {'sub': 'auth0|user_b'})

    def _items(self, response):
        return response.data.get('results', response.data) if isinstance(response.data, dict) else response.data

    def test_requires_authentication(self):
        response = self.client.get('/api/todos/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_todo(self):
        self.client.force_authenticate(user=self.user_a)
        response = self.client.post('/api/todos/', {'title': 'Buy milk'})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['title'], 'Buy milk')

        todo = Todo.objects.get(id=response.data['id'])
        self.assertEqual(todo.account, self.account_a)

    def test_list_todos_scoped_to_user(self):
        Todo.objects.create(account=self.account_a, title='A task')
        Todo.objects.create(account=self.account_b, title='B task')

        self.client.force_authenticate(user=self.user_a)
        response = self.client.get('/api/todos/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        items = self._items(response)
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]['title'], 'A task')

    def test_update_todo(self):
        todo = Todo.objects.create(account=self.account_a, title='Old')
        self.client.force_authenticate(user=self.user_a)

        response = self.client.patch(f'/api/todos/{todo.id}/', {'completed': True, 'title': 'Updated'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        todo.refresh_from_db()
        self.assertTrue(todo.completed)
        self.assertEqual(todo.title, 'Updated')

    def test_delete_todo(self):
        todo = Todo.objects.create(account=self.account_a, title='Delete me')
        self.client.force_authenticate(user=self.user_a)

        response = self.client.delete(f'/api/todos/{todo.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Todo.objects.filter(id=todo.id).exists())

    def test_idor_get_other_user_todo_returns_404(self):
        todo = Todo.objects.create(account=self.account_a, title='Private')
        self.client.force_authenticate(user=self.user_b)

        response = self.client.get(f'/api/todos/{todo.id}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_idor_update_other_user_todo_returns_404(self):
        todo = Todo.objects.create(account=self.account_a, title='Private')
        self.client.force_authenticate(user=self.user_b)

        response = self.client.patch(f'/api/todos/{todo.id}/', {'title': 'Hacked'})
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

        todo.refresh_from_db()
        self.assertEqual(todo.title, 'Private')

    def test_idor_delete_other_user_todo_returns_404(self):
        todo = Todo.objects.create(account=self.account_a, title='Private')
        self.client.force_authenticate(user=self.user_b)

        response = self.client.delete(f'/api/todos/{todo.id}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(Todo.objects.filter(id=todo.id).exists())

    def test_cannot_spoof_account_on_create(self):
        self.client.force_authenticate(user=self.user_b)
        response = self.client.post('/api/todos/', {
            'title': 'Spoof attempt',
            'account': str(self.account_a.id)
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        todo = Todo.objects.get(id=response.data['id'])
        self.assertEqual(todo.account, self.account_b)

    def test_filter_by_status(self):
        Todo.objects.create(account=self.account_a, title='Active', completed=False)
        Todo.objects.create(account=self.account_a, title='Done', completed=True)

        self.client.force_authenticate(user=self.user_a)

        res_active = self.client.get('/api/todos/?status=active')
        active_items = self._items(res_active)
        self.assertEqual(len(active_items), 1)
        self.assertEqual(active_items[0]['title'], 'Active')

        res_done = self.client.get('/api/todos/?status=completed')
        done_items = self._items(res_done)
        self.assertEqual(len(done_items), 1)
        self.assertEqual(done_items[0]['title'], 'Done')

    def test_search_by_title(self):
        Todo.objects.create(account=self.account_a, title='Buy apples')
        Todo.objects.create(account=self.account_a, title='Call bank')

        self.client.force_authenticate(user=self.user_a)
        response = self.client.get('/api/todos/?search=apple')
        results = self._items(response)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['title'], 'Buy apples')