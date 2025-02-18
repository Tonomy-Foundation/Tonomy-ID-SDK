# User Data and Logout

### Accessing User Data

```typescript
const accountName = await user.getAccountName();
const username = await user.getUsername();
const did = await user.getDid();
```

### Logout

```typescript
await user.logout();
```
