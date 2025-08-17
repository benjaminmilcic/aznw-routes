import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { YahtzeeService } from '../yahtzee.service';
import { CommonModule } from '@angular/common';
import { Dice } from '../yahtzee.types';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-yahtzee-dice',
    imports: [CommonModule],
    templateUrl: './yahtzee-dice.component.html',
    styleUrl: './yahtzee-dice.component.css'
})
export class YahtzeeDiceComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('container') container: ElementRef<HTMLDivElement>;
  diceOne: number;
  diceTwo: number;
  diceThree: number;
  diceFour: number;
  diceFive: number;
  showRotate = false;

  dice1: any;
  dice2: any;
  dice3: any;
  dice4: any;
  dice5: any;
  canCheckDises = false;
  dicesToKeepSubscription: Subscription;
  rollDiceSubscription: Subscription;

  constructor(public yahtzeeService: YahtzeeService) {}

  ngOnInit(): void {
    this.rollDiceSubscription = this.yahtzeeService.rollDice.subscribe(
      (dice) => {
        if (dice.diceCount === 1) {
          this.yahtzeeService.dices[0].checked = false;
          this.yahtzeeService.dices[1].checked = false;
          this.yahtzeeService.dices[2].checked = false;
          this.yahtzeeService.dices[3].checked = false;
          this.yahtzeeService.dices[4].checked = false;
        }
        if (!this.yahtzeeService.dices[0].checked) {
          this.diceOne = dice.dice1;
        }
        if (!this.yahtzeeService.dices[1].checked) {
          this.diceTwo = dice.dice2;
        }
        if (!this.yahtzeeService.dices[2].checked) {
          this.diceThree = dice.dice3;
        }
        if (!this.yahtzeeService.dices[3].checked) {
          this.diceFour = dice.dice4;
        }
        if (!this.yahtzeeService.dices[4].checked) {
          this.diceFive = dice.dice5;
        }
        this.canCheckDises = false;
        if (dice.diceCount === 1) {
          this.yahtzeeService.dices.forEach((dice) => (dice.checked = false));
        }
        this.rollDice();
        if (dice.diceCount !== 3) {
          setTimeout(() => {
            this.canCheckDises = true;
          }, 1000);
        } else {
          setTimeout(() => {
            let dice1;
            let dice2;
            let dice3;
            let dice4;
            let dice5;
            switch (this.diceOne) {
              case 1:
                dice1 = 1;
                break;
              case 2:
                dice1 = 5;
                break;
              case 3:
                dice1 = 6;
                break;
              case 4:
                dice1 = 3;
                break;
              case 5:
                dice1 = 4;
                break;
              case 6:
                dice1 = 2;
                break;

              default:
                break;
            }
            switch (this.diceTwo) {
              case 1:
                dice2 = 1;
                break;
              case 2:
                dice2 = 5;
                break;
              case 3:
                dice2 = 6;
                break;
              case 4:
                dice2 = 3;
                break;
              case 5:
                dice2 = 4;
                break;
              case 6:
                dice2 = 2;
                break;

              default:
                break;
            }
            switch (this.diceThree) {
              case 1:
                dice3 = 1;
                break;
              case 2:
                dice3 = 5;
                break;
              case 3:
                dice3 = 6;
                break;
              case 4:
                dice3 = 3;
                break;
              case 5:
                dice3 = 4;
                break;
              case 6:
                dice3 = 2;
                break;

              default:
                break;
            }
            switch (this.diceFour) {
              case 1:
                dice4 = 1;
                break;
              case 2:
                dice4 = 5;
                break;
              case 3:
                dice4 = 6;
                break;
              case 4:
                dice4 = 3;
                break;
              case 5:
                dice4 = 4;
                break;
              case 6:
                dice4 = 2;
                break;

              default:
                break;
            }
            switch (this.diceFive) {
              case 1:
                dice5 = 1;
                break;
              case 2:
                dice5 = 5;
                break;
              case 3:
                dice5 = 6;
                break;
              case 4:
                dice5 = 3;
                break;
              case 5:
                dice5 = 4;
                break;
              case 6:
                dice5 = 2;
                break;

              default:
                break;
            }
            this.yahtzeeService.dices.forEach((dice) => (dice.checked = true));
            this.yahtzeeService.sendFinalDices.next({
              dice1,
              dice2,
              dice3,
              dice4,
              dice5,
              diceCount: dice.diceCount,
            });
          }, 1000);
        }
      }
    );
    this.dicesToKeepSubscription = this.yahtzeeService.dicesToKeep.subscribe(
      (result) => {
        result.forEach((dice, index) => {
          this.yahtzeeService.dices[index].checked = dice;
        });
      }
    );
    this.yahtzeeService.socket.on('checkedDices', (checkedDices: boolean[]) => {
      if (
        this.yahtzeeService.players[this.yahtzeeService.playerOnMoveIndex]
          .isRemote
      ) {
        checkedDices.forEach((checked, index) => {
          this.yahtzeeService.dices[index].checked = checked;
        });
      }
    });
  }

  ngAfterViewInit(): void {
    this.dice1 = this.container.nativeElement.children[0];
    this.dice2 = this.container.nativeElement.children[1];
    this.dice3 = this.container.nativeElement.children[2];
    this.dice4 = this.container.nativeElement.children[3];
    this.dice5 = this.container.nativeElement.children[4];
  }

  rollDice() {
    this.showRotate = false;
    for (var i = 1; i <= 6; i++) {
      if (!this.yahtzeeService.dices[0].checked) {
        this.dice1.classList.remove('show-' + i);
      }
      if (!this.yahtzeeService.dices[1].checked) {
        this.dice2.classList.remove('show-' + i);
      }
      if (!this.yahtzeeService.dices[2].checked) {
        this.dice3.classList.remove('show-' + i);
      }
      if (!this.yahtzeeService.dices[3].checked) {
        this.dice4.classList.remove('show-' + i);
      }
      if (!this.yahtzeeService.dices[4].checked) {
        this.dice5.classList.remove('show-' + i);
      }
    }
    let temp1 = this.diceOne + 1;
    if (temp1 === 7) {
      temp1 = 1;
    }
    let temp2 = this.diceTwo + 1;
    if (temp2 === 7) {
      temp2 = 1;
    }
    let temp3 = this.diceThree + 1;
    if (temp3 === 7) {
      temp3 = 1;
    }
    let temp4 = this.diceFour + 1;
    if (temp4 === 7) {
      temp4 = 1;
    }
    let temp5 = this.diceFive + 1;
    if (temp5 === 7) {
      temp5 = 1;
    }
    if (!this.yahtzeeService.dices[0].checked) {
      this.dice1.classList.add('show-' + temp1);
    }
    if (!this.yahtzeeService.dices[1].checked) {
      this.dice2.classList.add('show-' + temp2);
    }
    if (!this.yahtzeeService.dices[2].checked) {
      this.dice3.classList.add('show-' + temp3);
    }
    if (!this.yahtzeeService.dices[3].checked) {
      this.dice4.classList.add('show-' + temp4);
    }
    if (!this.yahtzeeService.dices[4].checked) {
      this.dice5.classList.add('show-' + temp5);
    }
    setTimeout(() => {
      this.showRotate = true;
      for (var i = 1; i <= 6; i++) {
        if (!this.yahtzeeService.dices[0].checked) {
          this.dice1.classList.remove('show-' + i);
        }
        if (!this.yahtzeeService.dices[1].checked) {
          this.dice2.classList.remove('show-' + i);
        }
        if (!this.yahtzeeService.dices[2].checked) {
          this.dice3.classList.remove('show-' + i);
        }
        if (!this.yahtzeeService.dices[3].checked) {
          this.dice4.classList.remove('show-' + i);
        }
        if (!this.yahtzeeService.dices[4].checked) {
          this.dice5.classList.remove('show-' + i);
        }

        if (this.diceOne === i && !this.yahtzeeService.dices[0].checked) {
          this.dice1.classList.add('show-' + i);
        }
        if (this.diceTwo === i && !this.yahtzeeService.dices[1].checked) {
          this.dice2.classList.add('show-' + i);
        }
        if (this.diceThree === i && !this.yahtzeeService.dices[2].checked) {
          this.dice3.classList.add('show-' + i);
        }
        if (this.diceFour === i && !this.yahtzeeService.dices[3].checked) {
          this.dice4.classList.add('show-' + i);
        }
        if (this.diceFive === i && !this.yahtzeeService.dices[4].checked) {
          this.dice5.classList.add('show-' + i);
        }
      }
    }, 1);
  }

  toggleChecked(dice: Dice) {
    if (this.canCheckDises && this.yahtzeeService.dicesClickable) {
      dice.checked = !dice.checked;
      if (
        !this.yahtzeeService.players[this.yahtzeeService.playerOnMoveIndex]
          .isRemote
      ) {
        this.yahtzeeService.socket.emit(
          'checkedDices',
          this.yahtzeeService.dices.map((dice) => dice.checked)
        );
      }
    }
  }

  ngOnDestroy(): void {
    if (this.dicesToKeepSubscription) {
      this.dicesToKeepSubscription.unsubscribe();
    }
    if (this.rollDiceSubscription) {
      this.rollDiceSubscription.unsubscribe();
    }
  }
}
