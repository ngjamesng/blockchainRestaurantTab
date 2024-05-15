# Restaurant Tab Project

This project was inspired by my friend graduating from school, and hosting a graduation party. She was gracious enough to have offered to start an tab, with a limit for everyone in her party to grab food/drinks. 

This inspired me to think about how this would work in a smart contract, as it seemed fitting to enforce several rules and make the open tab secure and an enjoyable experience. 

## high level overview of the contract
Just like any tab that you would open at any restaurant or bar, you want only yourself and friends to be able to access and spend from your tab, and no one else. This is a smart contract enforcing the same rules as you would want in the traditional way. Here are some of the high level guarantees of this smart contract:

* A host can open a tab with any restaurant or tab.
* A host can control who belongs in their party:
  * can add people to their party when opening the tab
  * can add friends who come late.
  * can remove people from their party.
* The host and friends: 
  *  can purchase items and expense them on the tab if the tab has not yet reached the limit yet.
  * A host can increase the limit on the tab (represented as a deposit)
* Party crashers/outsiders cannot lie that they are part of a party and expense on a host's tab. They must be added into the party. 
  * This is my personal favorite benefit
* The host can close the tab. Once done, the following wil happen:
  * users will no longer be able to incur expenses on the contract
  * The restaurant will be paid for the expenses incurred
  * Any remaining amount leftover, from the deposit minus expenses, will be refunded to the host/tab owner.
  * If the host forgets to close the tab, the restaurant may be able to do so.

## new features to be added
* [ ] I would like to a basic front end so folks can interact with this smart contract in an easier fashion. 
* [ ] I would like to add the ability to set a time limit (maybe a  few hours, several hours, or a day), so that if a host/tab owner forgets to close the tab, the restaurant can close on the party's behalf after the time limit. Although, the host is incentivized close it earlier because of the remaining amount leftover.



Try running some of the following tasks:

```shell
npx hardhat help
npx hardhat test
REPORT_GAS=true npx hardhat test
npx hardhat node
```
