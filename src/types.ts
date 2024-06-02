export enum EventType {
    PREPAY_FOR_LISTING_EVENT = 'PrepayForListingEvent',
    COIN_SOCIALS_UPDATED_EVENT = 'CoinSocialsUpdatedEvent',
    STATUS_UPDATED_EVENT = 'CoinStatusChangedEvent',
    SWAP_EVENT = 'SwapEvent'
}

export enum CoinStatus {
    STARTING_UP = 0,
    ACTIVE = 1,
    CLOSE_PENDING = 2,
    CLOSED = 3,
}
