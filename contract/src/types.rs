use near_sdk::{
    borsh,
    borsh::{BorshDeserialize, BorshSerialize},
    json_types::{U128, U64},
    serde::{Deserialize, Serialize},
    AccountId,
};
use std::cmp::Ordering;
use std::collections::hash_map::DefaultHasher;
use std::fmt::{Display, Formatter};
use std::hash::{Hash, Hasher};
use std::io::Write;

// #[derive(Serialize, Deserialize, Clone, PartialEq)]
// #[serde(crate = "near_sdk::serde")]
// pub enum OrderActions {
//     // Cancel,
//     Match,
// }

#[derive(Serialize, Deserialize)]
#[serde(crate = "near_sdk::serde")]
#[serde(untagged)]
pub enum TokenReceiverMessage {
    Match {
        order_id: OrderId,
        orderbook_id: OrderId,
        matching_time: String,
    },
    NewOrderAction {
        sell_token: AccountId,
        sell_amount: U128,
        raw_sell_amount: U128,
        buy_token: AccountId,
        buy_amount: U128,
        raw_buy_amount: U128,
        action: String,
        creation_time: String,
        status: String,
    },
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(crate = "near_sdk::serde")]
pub struct NewOrderAction {
    pub sell_token: AccountId,
    pub sell_amount: U128,
    pub raw_sell_amount: U128,
    pub buy_token: AccountId,
    pub buy_amount: U128,
    pub raw_buy_amount: U128,
    pub action: String,
    pub creation_time: String,
    pub status: String,
}

#[derive(Serialize, Deserialize, BorshSerialize, BorshDeserialize, Clone, Debug, PartialEq)]
#[serde(crate = "near_sdk::serde")]
pub struct FilledOrderAction {
    pub sell_token: AccountId,
    pub sell_amount: U128,
    pub buy_token: AccountId,
    pub buy_amount: U128,
    pub action: String,
    pub creation_time: String,
    pub status: String,
    pub maker: AccountId,
    pub matcher: AccountId,
}

#[derive(Serialize, Deserialize, BorshSerialize, BorshDeserialize, Clone, Debug, PartialEq)]
#[serde(crate = "near_sdk::serde")]
pub struct OrderToOrderBook {
    pub buy_amount: U128,
    pub buy_token: AccountId,
    pub sell_amount: U128,
    pub sell_token: AccountId,
}

#[derive(Serialize, Deserialize, BorshSerialize, BorshDeserialize, Clone, Debug, PartialEq)]
#[serde(crate = "near_sdk::serde")]
pub struct GetOrderToOrderBook {
    pub order_id: OrderId,
    pub order: OrderToOrderBook,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(crate = "near_sdk::serde")]
pub struct OrderView {
    pub order: Order,
    pub order_id: OrderId,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(crate = "near_sdk::serde")]
pub struct FilledOrderView {
    pub order: FilledOrderAction,
    pub order_id: OrderId,
}

#[derive(Serialize, Deserialize, BorshSerialize, BorshDeserialize, Clone, Debug, PartialEq)]
#[serde(crate = "near_sdk::serde")]
pub struct Order {
    pub maker: AccountId,
    pub sell_token: AccountId,
    pub sell_amount: U128,
    pub buy_token: AccountId,
    pub buy_amount: U128,
    pub action: String,
    pub creation_time: String,
    pub status: String,
}

impl Hash for Order {
    fn hash<H: Hasher>(&self, state: &mut H) {
        self.maker.hash(state);
        self.sell_token.hash(state);
        self.sell_amount.0.hash(state);
        self.buy_token.hash(state);
        self.buy_amount.0.hash(state);
        self.action.hash(state);
        self.creation_time.hash(state);
        self.status.hash(state);
    }
}

impl Hash for FilledOrderAction {
    fn hash<H: Hasher>(&self, state: &mut H) {
        self.maker.hash(state);
        self.sell_token.hash(state);
        self.sell_amount.0.hash(state);
        self.buy_token.hash(state);
        self.buy_amount.0.hash(state);
        self.action.hash(state);
        self.creation_time.hash(state);
        self.status.hash(state);
        self.matcher.hash(state);
    }
}

impl Hash for OrderToOrderBook {
    fn hash<H: Hasher>(&self, state: &mut H) {
        self.sell_amount.0.hash(state);
        self.buy_amount.0.hash(state);
        self.buy_token.hash(state);
        self.sell_token.hash(state);
    }
}

impl Order {
    pub fn get_price_for_key(&self) -> u128 {
        (self.sell_amount.0 + 1000000000000000000000000000000) / self.buy_amount.0
    }

    pub fn get_id(&self) -> OrderId {
        let mut hasher = DefaultHasher::new();
        self.hash(&mut hasher);
        let hash = hasher.finish();

        hash.to_string()
    }

    pub fn from_action(action: NewOrderAction, sender: AccountId) -> Self {
        Order {
            maker: sender,
            sell_token: action.sell_token,
            sell_amount: action.sell_amount,
            buy_token: action.buy_token,
            buy_amount: action.buy_amount,
            action: action.action,
            creation_time: action.creation_time,
            status: action.status,
        }
    }
}

impl FilledOrderAction {
    pub fn get_id(&self) -> OrderId {
        let mut hasher = DefaultHasher::new();
        self.hash(&mut hasher);
        let hash = hasher.finish();

        hash.to_string()
    }
}

impl OrderToOrderBook {
    pub fn get_id(&self) -> OrderId {
        let mut hasher = DefaultHasher::new();
        self.hash(&mut hasher);
        let hash = hasher.finish();

        hash.to_string()
    }
}

// #[derive(Debug, Ord, PartialEq, Clone, Copy, BorshSerialize, BorshDeserialize, Serialize, Deserialize)]
// #[serde(crate = "near_sdk::serde")]
pub type OrderId = String;

// impl OrderId {
//     pub fn from_order(order: &Order) -> Self {
//         let mut hasher = DefaultHasher::new();
//         order.hash(&mut hasher);

//         Self(order.get_price_for_key(), hasher.finish())
//     }
// }

// impl Eq for OrderId {}

// impl PartialOrd for OrderId {
//     fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
//         self.0.partial_cmp(&other.0)
//     }
// }

// impl Display for OrderId {
//     fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
//         write!(f, "{}{}", self.0, self.1)
//     }
// }

#[derive(Copy, Clone, BorshSerialize, BorshDeserialize)]
pub struct Fee {
    pub percent: u16,
    pub earned: u128,
}

impl Fee {
    pub fn new(percent: u16, earned: u128) -> Self {
        Self { percent, earned }
    }
}
