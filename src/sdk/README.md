# SDK Architecture

This architecture sets forward the structure of the SDK library.

This is what we should work towards!

## Controllers

Provide the functional controllers called in the Tonomy ID smart wallet.

## Storage

Storage interfaces and default implementations for managing persistent data and key management.

## Services

Are self-contained libraries that help controllers connect to services. They should not depend on controllers.

## Util (utilities)

A common set of helper functions used by controllers, services and storage.
