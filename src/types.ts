export enum EventType {
    PREPAY_FOR_LISTING_EVENT = 'PrepayForListingEvent',
    COIN_SOCIALS_UPDATED_EVENT = 'CoinSocialsUpdatedEvent',
    STATUS_UPDATED_EVENT = 'CoinStatusChangedEvent',
    SWAP_EVENT = 'SwapEvent'
}

export enum CoinStatus {
    ACTIVE = 0,
    CLOSE_PENDING = 1,
    CLOSED = 2,
}
