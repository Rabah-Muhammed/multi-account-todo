from rest_framework import viewsets, permissions
from .models import Todo
from .serializers import TodoSerializer


class TodoViewSet(viewsets.ModelViewSet):
    serializer_class = TodoSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Strictly scope all operations to the authenticated user's account
        queryset = Todo.objects.filter(account=self.request.user.account)

        # Optional status filter: ?status=active or ?status=completed
        status = self.request.query_params.get('status')
        if status == 'active':
            queryset = queryset.filter(completed=False)
        elif status == 'completed':
            queryset = queryset.filter(completed=True)

        # Optional search by title: ?search=query
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(title__icontains=search.strip())

        return queryset

    def perform_create(self, serializer):
        # Always bind the Todo to the authenticated user's account derived from the JWT
        serializer.save(account=self.request.user.account)