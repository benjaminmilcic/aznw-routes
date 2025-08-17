import { CommonModule } from '@angular/common';
import { Component, HostListener, Input, OnDestroy, OnInit } from '@angular/core';
import { YahtzeeService } from '../yahtzee.service';
import { RollDice, ScoreRow, UserScore } from '../yahtzee.types';
import { Subscription } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';

@Component({
    selector: 'app-yahtzee-score',
    imports: [CommonModule],
    templateUrl: './yahtzee-score.component.html',
    styleUrl: './yahtzee-score.component.css'
})
export class YahtzeeScoreComponent implements OnInit, OnDestroy {
  finalDice: RollDice = {
    dice1: null,
    dice2: null,
    dice3: null,
    dice4: null,
    dice5: null,
    diceCount: null,
  };
  ones: string;
  twos: string;
  threes: string;
  fours: string;
  fives: string;
  sixes: string;
  threeInARow: string;
  fourInARow: string;
  fullHouse: string;
  smallStraight: string;
  largeStraight: string;
  yahtzee: string;
  chance: string;
  sum: string;
  bonus: string;
  total: string;
  sendFinalDicesSubscription: Subscription;
  startGameSunscription: Subscription;
  screenHeight: number = window.innerHeight;

  @HostListener('window:resize', ['$event'])
  onResize(event: Event) {
    this.screenHeight = window.innerHeight;
  }

  constructor(
    public yahtzeeService: YahtzeeService,
    private translate: TranslateService
  ) {}

  async ngOnInit() {
    this.startGame();
    this.setScoreTranslations();
    this.translate.onLangChange.subscribe(() => {
      this.setScoreTranslations();
    });
    this.startGameSunscription = this.yahtzeeService.startGame.subscribe(() => {
      this.startGame();
    });
    this.sendFinalDicesSubscription =
      this.yahtzeeService.sendFinalDices.subscribe((dice) => {
        this.finalDice = dice;
        if (
          this.yahtzeeService.players[this.yahtzeeService.playerOnMoveIndex]
            .isRemote
        ) {
          this.waitForRemoteRowToPutIn().then(async () => {
            let onesPossible = this.setSuggestOnes();
            let twosPossible = this.setSuggestTwos();
            let threesPossible = this.setSuggestThrees();
            let foursPossible = this.setSuggestFours();
            let fivesPossible = this.setSuggestFives();
            let sixsPossible = this.setSuggestSixs();
            let threeInARowsPossible = this.setSuggest3InARow();
            let fourInARowsPossible = this.setSuggest4InARow();
            let fullHousePossible = this.setSuggestFullHouse();
            let smallStraightPossible = this.setSuggestSmallStraight();
            let largeStraightPossible = this.setSuggestLargeStraight();
            let chancePossible = this.setSuggestChance();
            let yathzeePossible = this.setSuggestYahtzee();

            await this.setsuggestedNumber(
              this.yahtzeeService.score[this.yahtzeeService.rowToPutInRemote]
                .user[this.yahtzeeService.playerOnMoveIndex],
              this.yahtzeeService.rowToPutInRemote
            );
            this.yahtzeeService.rowToPutInRemote = null;
          });
        } else {
          let onesPossible = this.setSuggestOnes();
          let twosPossible = this.setSuggestTwos();
          let threesPossible = this.setSuggestThrees();
          let foursPossible = this.setSuggestFours();
          let fivesPossible = this.setSuggestFives();
          let sixsPossible = this.setSuggestSixs();
          let threeInARowsPossible = this.setSuggest3InARow();
          let fourInARowsPossible = this.setSuggest4InARow();
          let fullHousePossible = this.setSuggestFullHouse();
          let smallStraightPossible = this.setSuggestSmallStraight();
          let largeStraightPossible = this.setSuggestLargeStraight();
          let chancePossible = this.setSuggestChance();
          let yathzeePossible = this.setSuggestYahtzee();
          this.yahtzeeService.selectField.next(true);
          if (
            this.yahtzeeService.players[
              this.yahtzeeService.playerOnMoveIndex
            ].name.includes('Computer')
          ) {
            this.makeComputerMove(
              onesPossible,
              twosPossible,
              threesPossible,
              foursPossible,
              fivesPossible,
              sixsPossible,
              threeInARowsPossible,
              fourInARowsPossible,
              fullHousePossible,
              smallStraightPossible,
              largeStraightPossible,
              chancePossible,
              yathzeePossible
            );
          }
        }
      });
  }

  waitForRemoteRowToPutIn(): Promise<any> {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (this.yahtzeeService.rowToPutInRemote !== null) {
          clearInterval(checkInterval);
          resolve(this.yahtzeeService.rowToPutInRemote);
        }
      }, 1);
    });
  }

  setScoreTranslations() {
    this.translate.get('gimmicks.games.ones').subscribe((res) => {
      this.ones = res;
      this.yahtzeeService.score[0].name = res;
    });
    this.translate.get('gimmicks.games.twos').subscribe((res) => {
      this.twos = res;
      this.yahtzeeService.score[1].name = res;
    });
    this.translate.get('gimmicks.games.threes').subscribe((res) => {
      this.threes = res;
      this.yahtzeeService.score[2].name = res;
    });
    this.translate.get('gimmicks.games.fours').subscribe((res) => {
      this.fours = res;
      this.yahtzeeService.score[3].name = res;
    });
    this.translate.get('gimmicks.games.fives').subscribe((res) => {
      this.fives = res;
      this.yahtzeeService.score[4].name = res;
    });
    this.translate.get('gimmicks.games.sixes').subscribe((res) => {
      this.sixes = res;
      this.yahtzeeService.score[5].name = res;
    });
    this.translate.get('gimmicks.games.sum').subscribe((res) => {
      this.sum = res;
      this.yahtzeeService.score[6].name = res;
    });
    this.translate.get('gimmicks.games.bonus').subscribe((res) => {
      this.bonus = res;
      this.yahtzeeService.score[7].name = res;
    });
    this.translate.get('gimmicks.games.threeInARow').subscribe((res) => {
      this.threeInARow = res;
      this.yahtzeeService.score[8].name = res;
    });
    this.translate.get('gimmicks.games.fourInARow').subscribe((res) => {
      this.fourInARow = res;
      this.yahtzeeService.score[9].name = res;
    });
    this.translate.get('gimmicks.games.fullHouse').subscribe((res) => {
      this.fullHouse = res;
      this.yahtzeeService.score[10].name = res;
    });
    this.translate.get('gimmicks.games.smallStraight').subscribe((res) => {
      this.smallStraight = res;
      this.yahtzeeService.score[11].name = res;
    });
    this.translate.get('gimmicks.games.largeStraight').subscribe((res) => {
      this.largeStraight = res;
      this.yahtzeeService.score[12].name = res;
    });
    this.translate.get('gimmicks.games.chance').subscribe((res) => {
      this.chance = res;
      this.yahtzeeService.score[13].name = res;
    });
    this.translate.get('gimmicks.games.yahtzee').subscribe((res) => {
      this.yahtzee = res;
      this.yahtzeeService.score[14].name = res;
    });
    this.translate.get('gimmicks.games.total2').subscribe((res) => {
      this.total = res;
      this.yahtzeeService.score[15].name = res;
    });
  }

  makeComputerMove(
    onesPossible: number,
    twosPossible: number,
    threesPossible: number,
    foursPossible: number,
    fivesPossible: number,
    sixsPossible: number,
    threeInARowsPossible: number,
    fourInARowsPossible: number,
    fullHousePossible: number,
    smallStraightPossible: number,
    largeStraightPossible: number,
    chancePossible: number,
    yathzeePossible: number
  ) {
    let bestChoice = this.decideYahtzeeMove(
      {
        onesPossible,
        twosPossible,
        threesPossible,
        foursPossible,
        fivesPossible,
        sixsPossible,
        threeInARowsPossible,
        fourInARowsPossible,
        fullHousePossible,
        smallStraightPossible,
        largeStraightPossible,
        chancePossible,
        yathzeePossible,
      },
      {
        ones: this.yahtzeeService.score[0].user[
          this.yahtzeeService.playerOnMoveIndex
        ].number,
        twos: this.yahtzeeService.score[1].user[
          this.yahtzeeService.playerOnMoveIndex
        ].number,
        threes:
          this.yahtzeeService.score[2].user[
            this.yahtzeeService.playerOnMoveIndex
          ].number,
        fours:
          this.yahtzeeService.score[3].user[
            this.yahtzeeService.playerOnMoveIndex
          ].number,
        fives:
          this.yahtzeeService.score[4].user[
            this.yahtzeeService.playerOnMoveIndex
          ].number,
        sixes:
          this.yahtzeeService.score[5].user[
            this.yahtzeeService.playerOnMoveIndex
          ].number,
      }
    );
    let row: number;
    switch (bestChoice) {
      case 'onesPossible':
        row = 0;
        break;
      case 'twosPossible':
        row = 1;
        break;
      case 'threesPossible':
        row = 2;
        break;
      case 'foursPossible':
        row = 3;
        break;
      case 'fivesPossible':
        row = 4;
        break;
      case 'sixsPossible':
        row = 5;
        break;
      case 'threeInARowsPossible':
        row = 8;
        break;
      case 'fourInARowsPossible':
        row = 9;
        break;
      case 'fullHousePossible':
        row = 10;
        break;
      case 'smallStraightPossible':
        row = 11;
        break;
      case 'largeStraightPossible':
        row = 12;
        break;
      case 'chancePossible':
        row = 13;
        break;
      case 'yathzeePossible':
        row = 14;
        break;

      default:
        break;
    }
    this.setsuggestedNumber(
      this.yahtzeeService.score[row].user[
        this.yahtzeeService.playerOnMoveIndex
      ],
      row
    );
  }

  decideYahtzeeMove(
    possibilities: {
      onesPossible: number;
      twosPossible: number;
      threesPossible: number;
      foursPossible: number;
      fivesPossible: number;
      sixsPossible: number;
      threeInARowsPossible: number;
      fourInARowsPossible: number;
      fullHousePossible: number;
      smallStraightPossible: number;
      largeStraightPossible: number;
      chancePossible: number;
      yathzeePossible: number;
    },
    currentUpperSection: {
      ones: number | null;
      twos: number | null;
      threes: number | null;
      fours: number | null;
      fives: number | null;
      sixes: number | null;
    }
  ): keyof typeof possibilities | null {
    // Errechneter Wert der oberen Sektion (zum Bonus von 63 Punkten)
    let upperSectionScore = 0;
    for (const key of ['ones', 'twos', 'threes', 'fours', 'fives', 'sixes']) {
      if (
        currentUpperSection[key as keyof typeof currentUpperSection] !== null
      ) {
        upperSectionScore +=
          currentUpperSection[key as keyof typeof currentUpperSection]!;
      }
    }

    // Liste der möglichen Felder in priorisierter Reihenfolge
    const priorities: (keyof typeof possibilities)[] = [
      'yathzeePossible', // 50 Punkte, immer nehmen wenn möglich
      'largeStraightPossible', // 40 Punkte, sehr stark
      'smallStraightPossible', // 30 Punkte, auch wichtig
      'fullHousePossible', // 25 Punkte, falls vorhanden
      'fourInARowsPossible', // Hohe Punktzahl möglich
      'threeInARowsPossible', // Hohe Punktzahl möglich
    ];

    // Beste Option in der oberen Sektion (Einsen bis Sechsen)
    const upperSectionChoices: (keyof typeof possibilities)[] = [
      'sixsPossible',
      'fivesPossible',
      'foursPossible',
      'threesPossible',
      'twosPossible',
      'onesPossible',
    ];

    let bestUpperSectionChoice: keyof typeof possibilities | null = null;
    let bestUpperValue = -1;

    for (const key of upperSectionChoices) {
      const value = possibilities[key];
      if (value !== null && value > bestUpperValue) {
        bestUpperValue = value;
        bestUpperSectionChoice = key;
      }
    }

    // Falls wir nahe am Bonus von 63 Punkten sind, bevorzugen wir hohe Zahlen in der oberen Sektion
    const pointsNeededForBonus = 63 - upperSectionScore;
    if (bestUpperSectionChoice && bestUpperValue >= pointsNeededForBonus) {
      return bestUpperSectionChoice;
    }

    // Priorisierte Optionen durchgehen
    for (const key of priorities) {
      if (possibilities[key] !== null && possibilities[key]! > 0) {
        return key;
      }
    }

    // Falls nichts aus den Hauptprioritäten passt, dann bestes aus der oberen Sektion nehmen
    if (bestUpperSectionChoice) {
      return bestUpperSectionChoice;
    }

    // Falls nichts anderes passt, Chance nehmen
    if (
      possibilities.chancePossible !== null &&
      possibilities.chancePossible! > 0
    ) {
      return 'chancePossible';
    }

    // Falls nichts mehr geht, setzen wir ein "X" in das Feld mit der geringsten Priorität
    let worstChoice: keyof typeof possibilities | null = null;
    let worstValue = 1000; // Hoher Startwert, damit wir das niedrigste finden

    for (const key of Object.keys(
      possibilities
    ) as (keyof typeof possibilities)[]) {
      const value = possibilities[key];
      if (value === 0) {
        // Nur Felder mit 0 anschauen (weil X gesetzt wird)
        if (worstChoice === null || value < worstValue) {
          worstValue = value;
          worstChoice = key;
        }
      }
    }

    return worstChoice;
  }

  startGame() {
    this.yahtzeeService.score = [
      { name: this.ones, bigBorder: false, user: null },
      { name: this.twos, bigBorder: false, user: null },
      { name: this.threes, bigBorder: false, user: null },
      { name: this.fours, bigBorder: false, user: null },
      { name: this.fives, bigBorder: false, user: null },
      { name: this.sixes, bigBorder: true, user: null },
      { name: this.sum, bigBorder: false, user: null },
      { name: this.bonus, bigBorder: true, user: null },
      { name: this.threeInARow, bigBorder: false, user: null },
      { name: this.fourInARow, bigBorder: false, user: null },
      { name: this.fullHouse, bigBorder: false, user: null },
      { name: this.smallStraight, bigBorder: false, user: null },
      { name: this.largeStraight, bigBorder: false, user: null },
      { name: this.chance, bigBorder: false, user: null },
      { name: this.yahtzee, bigBorder: true, user: null },
      { name: this.total, bigBorder: false, user: null },
    ];
    this.yahtzeeService.score.forEach((row, index) => {
      row.user = [];
      this.yahtzeeService.players.forEach((player, index2) => {
        row.user.push({
          suggestNumber: null,
          number: null,
          finished: null,
        });
        if (index === 6 || index === 15) {
          row.user[index2].number = 0;
          row.user[index2].finished = true;
        }
      });
    });
  }

  crossesOutRows() {
    let possibilities = this.yahtzeeService.score.filter(
      (row, index) =>
        index !== 6 &&
        index !== 7 &&
        index !== 15 &&
        !row.user[this.yahtzeeService.playerOnMoveIndex].finished
    );
    possibilities.forEach((row) => {
      row.user[this.yahtzeeService.playerOnMoveIndex].suggestNumber = 0;
    });
  }

  setSuggestOnes(): number {
    if (
      !this.yahtzeeService.score[0].user[this.yahtzeeService.playerOnMoveIndex]
        .finished
    ) {
      let result = 0;
      Object.keys(this.finalDice).forEach((item, index) => {
        if (index !== 5 && this.finalDice[item] === 1) {
          result++;
        }
      });
      // if (result !== 0) {
      this.yahtzeeService.score[0].user[
        this.yahtzeeService.playerOnMoveIndex
      ].suggestNumber = result;
      return result;
      // } else {
      //   return false;
      // }
    } else {
      return null;
    }
  }

  setSuggestTwos(): number {
    if (
      !this.yahtzeeService.score[1].user[this.yahtzeeService.playerOnMoveIndex]
        .finished
    ) {
      let result = 0;
      Object.keys(this.finalDice).forEach((item, index) => {
        if (index !== 5 && this.finalDice[item] === 2) {
          result = result + 2;
        }
      });
      // if (result !== 0) {
      this.yahtzeeService.score[1].user[
        this.yahtzeeService.playerOnMoveIndex
      ].suggestNumber = result;
      return result;
      // } else {
      //   return false;
      // }
    } else {
      return null;
    }
  }

  setSuggestThrees(): number {
    if (
      !this.yahtzeeService.score[2].user[this.yahtzeeService.playerOnMoveIndex]
        .finished
    ) {
      let result = 0;
      Object.keys(this.finalDice).forEach((item, index) => {
        if (index !== 5 && this.finalDice[item] === 3) {
          result = result + 3;
        }
      });
      // if (result !== 0) {
      this.yahtzeeService.score[2].user[
        this.yahtzeeService.playerOnMoveIndex
      ].suggestNumber = result;
      return result;
      // } else {
      //   return false;
      // }
    } else {
      return null;
    }
  }

  setSuggestFours(): number {
    if (
      !this.yahtzeeService.score[3].user[this.yahtzeeService.playerOnMoveIndex]
        .finished
    ) {
      let result = 0;
      Object.keys(this.finalDice).forEach((item, index) => {
        if (index !== 5 && this.finalDice[item] === 4) {
          result = result + 4;
        }
      });
      // if (result !== 0) {
      this.yahtzeeService.score[3].user[
        this.yahtzeeService.playerOnMoveIndex
      ].suggestNumber = result;
      return result;
      // } else {
      //   return false;
      // }
    } else {
      return null;
    }
  }

  setSuggestFives(): number {
    if (
      !this.yahtzeeService.score[4].user[this.yahtzeeService.playerOnMoveIndex]
        .finished
    ) {
      let result = 0;
      Object.keys(this.finalDice).forEach((item, index) => {
        if (index !== 5 && this.finalDice[item] === 5) {
          result = result + 5;
        }
      });
      // if (result !== 0) {
      this.yahtzeeService.score[4].user[
        this.yahtzeeService.playerOnMoveIndex
      ].suggestNumber = result;
      return result;
      // } else {
      //   return false;
      // }
    } else {
      return null;
    }
  }

  setSuggestSixs(): number {
    if (
      !this.yahtzeeService.score[5].user[this.yahtzeeService.playerOnMoveIndex]
        .finished
    ) {
      let result = 0;
      Object.keys(this.finalDice).forEach((item, index) => {
        if (index !== 5 && this.finalDice[item] === 6) {
          result = result + 6;
        }
      });
      // if (result !== 0) {
      this.yahtzeeService.score[5].user[
        this.yahtzeeService.playerOnMoveIndex
      ].suggestNumber = result;
      return result;
      // } else {
      //   return false;
      // }
    } else {
      return null;
    }
  }

  setSuggest3InARow(): number {
    if (
      !this.yahtzeeService.score[8].user[this.yahtzeeService.playerOnMoveIndex]
        .finished
    ) {
      let result = 0;
      let numbers = [
        this.finalDice.dice1,
        this.finalDice.dice2,
        this.finalDice.dice3,
        this.finalDice.dice4,
        this.finalDice.dice5,
      ];
      const counts = {};
      for (let num of numbers) {
        counts[num] = (counts[num] || 0) + 1;
        if (counts[num] === 3) {
          result = numbers.reduce((sum, num) => sum + num, 0);
        }
      }

      // if (result !== 0) {
      this.yahtzeeService.score[8].user[
        this.yahtzeeService.playerOnMoveIndex
      ].suggestNumber = result;
      return result;
      // } else {
      //   return false;
      // }
    } else {
      return null;
    }
  }

  setSuggest4InARow(): number {
    if (
      !this.yahtzeeService.score[9].user[this.yahtzeeService.playerOnMoveIndex]
        .finished
    ) {
      let result = 0;
      let numbers = [
        this.finalDice.dice1,
        this.finalDice.dice2,
        this.finalDice.dice3,
        this.finalDice.dice4,
        this.finalDice.dice5,
      ];
      const counts = {};
      for (let num of numbers) {
        counts[num] = (counts[num] || 0) + 1;
        if (counts[num] === 4) {
          result = numbers.reduce((sum, num) => sum + num, 0);
        }
      }

      // if (result !== 0) {
      this.yahtzeeService.score[9].user[
        this.yahtzeeService.playerOnMoveIndex
      ].suggestNumber = result;
      return result;
      // } else {
      //   return false;
      // }
    } else {
      return null;
    }
  }

  setSuggestFullHouse(): number {
    if (
      !this.yahtzeeService.score[10].user[this.yahtzeeService.playerOnMoveIndex]
        .finished
    ) {
      let result = 0;
      let numbers = [
        this.finalDice.dice1,
        this.finalDice.dice2,
        this.finalDice.dice3,
        this.finalDice.dice4,
        this.finalDice.dice5,
      ];
      const counts = {};
      for (let num of numbers) {
        counts[num] = (counts[num] || 0) + 1;
      }
      const values = Object.values(counts);
      if (values.includes(3) && values.includes(2)) {
        result = 25;
      }

      // if (result !== 0) {
      this.yahtzeeService.score[10].user[
        this.yahtzeeService.playerOnMoveIndex
      ].suggestNumber = result;
      return result;
      // } else {
      //   return false;
      // }
    } else {
      return null;
    }
  }

  setSuggestSmallStraight(): number {
    if (
      !this.yahtzeeService.score[11].user[this.yahtzeeService.playerOnMoveIndex]
        .finished
    ) {
      let result = 0;
      let numbers = [
        this.finalDice.dice1,
        this.finalDice.dice2,
        this.finalDice.dice3,
        this.finalDice.dice4,
        this.finalDice.dice5,
      ];
      const uniqueSorted = [...new Set(numbers)].sort((a, b) => a - b);
      const smallStraights = [
        [1, 2, 3, 4],
        [2, 3, 4, 5],
        [3, 4, 5, 6],
      ];
      if (
        smallStraights.some((straight) =>
          straight.every((num) => uniqueSorted.includes(num))
        )
      ) {
        result = 30;
      }

      // if (result !== 0) {
      this.yahtzeeService.score[11].user[
        this.yahtzeeService.playerOnMoveIndex
      ].suggestNumber = result;
      return result;
      // } else {
      //   return false;
      // }
    } else {
      return null;
    }
  }

  setSuggestLargeStraight(): number {
    if (
      !this.yahtzeeService.score[12].user[this.yahtzeeService.playerOnMoveIndex]
        .finished
    ) {
      let result = 0;
      let numbers = [
        this.finalDice.dice1,
        this.finalDice.dice2,
        this.finalDice.dice3,
        this.finalDice.dice4,
        this.finalDice.dice5,
      ];
      const uniqueSorted = [...new Set(numbers)].sort((a, b) => a - b);
      const largeStraights = [
        [1, 2, 3, 4, 5],
        [2, 3, 4, 5, 6],
      ];
      if (
        largeStraights.some((straight) =>
          straight.every((num, index) => num === uniqueSorted[index])
        )
      ) {
        result = 40;
      }

      // if (result !== 0) {
      this.yahtzeeService.score[12].user[
        this.yahtzeeService.playerOnMoveIndex
      ].suggestNumber = result;
      return result;
      // } else {
      //   return false;
      // }
    } else {
      return null;
    }
  }

  setSuggestChance(): number {
    if (
      !this.yahtzeeService.score[13].user[this.yahtzeeService.playerOnMoveIndex]
        .finished
    ) {
      let result = 0;
      let numbers = [
        this.finalDice.dice1,
        this.finalDice.dice2,
        this.finalDice.dice3,
        this.finalDice.dice4,
        this.finalDice.dice5,
      ];
      result = numbers.reduce((sum, num) => sum + num, 0);

      // if (result !== 0) {
      this.yahtzeeService.score[13].user[
        this.yahtzeeService.playerOnMoveIndex
      ].suggestNumber = result;
      return result;
      // } else {
      //   return false;
      // }
    } else {
      return null;
    }
  }

  setSuggestYahtzee(): number {
    if (
      !this.yahtzeeService.score[14].user[this.yahtzeeService.playerOnMoveIndex]
        .finished
    ) {
      let result = 0;
      let numbers = [
        this.finalDice.dice1,
        this.finalDice.dice2,
        this.finalDice.dice3,
        this.finalDice.dice4,
        this.finalDice.dice5,
      ];
      for (let i = 1; i <= 6; i++) {
        if (numbers.filter((num) => num === i).length >= 5) {
          result = 50;
          break;
        }
      }

      // if (result !== 0) {
      this.yahtzeeService.score[14].user[
        this.yahtzeeService.playerOnMoveIndex
      ].suggestNumber = result;
      return result;
      // } else {
      //   return false;
      // }
    } else {
      return null;
    }
  }

  async setsuggestedNumber(userScore: UserScore, rowIndex: number) {
    let temp = userScore.suggestNumber;
    let timeOut;
    if (
      this.yahtzeeService.players[this.yahtzeeService.playerOnMoveIndex]
        .isRemote
    ) {
      this.setAllSuggestionsToNull();
      timeOut = 1000;
    } else if (
      this.yahtzeeService.players[
        this.yahtzeeService.playerOnMoveIndex
      ].name.includes('Computer')
    ) {
      this.setAllSuggestionsToNull();
      timeOut = 1000;
    } else {
      timeOut = 1;
    }
    userScore.suggestNumber = temp;
    userScore.number = temp;

    setTimeout(() => {
      userScore.finished = true;
      this.setAllSuggestionsToNull();
      this.calculateSumAndBonus();
      this.yahtzeeService.selectField.next(false);
      if (
        !this.yahtzeeService.players[this.yahtzeeService.playerOnMoveIndex]
          .isRemote &&
        this.yahtzeeService.isRemoteGame
      ) {
        new Promise((resolve) => {
          this.yahtzeeService.socket.emit(
            'setRemoteRowToPutIn',
            rowIndex,
            (success: boolean) => {
              resolve(success);
            }
          );
        }).then((success) => {
          if (success) {
            this.yahtzeeService.rowToPutInRemote = null;
            if (
              this.yahtzeeService.moveCount === 13 &&
              this.yahtzeeService.playerOnMoveIndex ===
                this.yahtzeeService.players.length - 1
            ) {
              this.gameOver();
            } else {
              this.nextPlayer();
            }
          }
        });
      } else {
        this.yahtzeeService.rowToPutInRemote = null;
        if (
          this.yahtzeeService.moveCount === 13 &&
          this.yahtzeeService.playerOnMoveIndex ===
            this.yahtzeeService.players.length - 1
        ) {
          this.gameOver();
        } else {
          this.nextPlayer();
        }
      }
    }, timeOut);
  }

  setAllSuggestionsToNull() {
    this.yahtzeeService.score.forEach((row) => {
      row.user[this.yahtzeeService.playerOnMoveIndex].suggestNumber = null;
    });
  }

  calculateSumAndBonus() {
    this.yahtzeeService.score[6].user[
      this.yahtzeeService.playerOnMoveIndex
    ].number =
      this.yahtzeeService.score[0].user[this.yahtzeeService.playerOnMoveIndex]
        .number +
      this.yahtzeeService.score[1].user[this.yahtzeeService.playerOnMoveIndex]
        .number +
      this.yahtzeeService.score[2].user[this.yahtzeeService.playerOnMoveIndex]
        .number +
      this.yahtzeeService.score[3].user[this.yahtzeeService.playerOnMoveIndex]
        .number +
      this.yahtzeeService.score[4].user[this.yahtzeeService.playerOnMoveIndex]
        .number +
      this.yahtzeeService.score[5].user[this.yahtzeeService.playerOnMoveIndex]
        .number;
    let upperPartFinished = this.yahtzeeService.score
      .filter((item, index) => index < 6)
      .map((item) => item.user[this.yahtzeeService.playerOnMoveIndex].finished)
      .every((item) => item === true);
    if (
      upperPartFinished &&
      this.yahtzeeService.score[6].user[this.yahtzeeService.playerOnMoveIndex]
        .number >= 63
    ) {
      this.yahtzeeService.score[7].user[
        this.yahtzeeService.playerOnMoveIndex
      ].number = 50;
      this.yahtzeeService.score[7].user[
        this.yahtzeeService.playerOnMoveIndex
      ].finished = true;
    }
    this.yahtzeeService.score[15].user[
      this.yahtzeeService.playerOnMoveIndex
    ].number =
      this.yahtzeeService.score[6].user[this.yahtzeeService.playerOnMoveIndex]
        .number +
      this.yahtzeeService.score[7].user[this.yahtzeeService.playerOnMoveIndex]
        .number +
      this.yahtzeeService.score[8].user[this.yahtzeeService.playerOnMoveIndex]
        .number +
      this.yahtzeeService.score[9].user[this.yahtzeeService.playerOnMoveIndex]
        .number +
      this.yahtzeeService.score[10].user[this.yahtzeeService.playerOnMoveIndex]
        .number +
      this.yahtzeeService.score[11].user[this.yahtzeeService.playerOnMoveIndex]
        .number +
      this.yahtzeeService.score[12].user[this.yahtzeeService.playerOnMoveIndex]
        .number +
      this.yahtzeeService.score[13].user[this.yahtzeeService.playerOnMoveIndex]
        .number +
      this.yahtzeeService.score[14].user[this.yahtzeeService.playerOnMoveIndex]
        .number;
  }

  nextPlayer() {
    this.yahtzeeService.playerOnMoveIndex++;
    if (
      this.yahtzeeService.playerOnMoveIndex >
      this.yahtzeeService.players.length - 1
    ) {
      this.yahtzeeService.playerOnMoveIndex = 0;
    }

    this.yahtzeeService.nextplayer.next();
  }

  gameOver() {
    let names = this.yahtzeeService.players.map((item) => item.name);
    let points = this.yahtzeeService.score[15].user.map((item) => item.number);
    const sortedData = names
      .map((name, index) => ({ name, point: points[index] }))
      .sort((a, b) => b.point - a.point); // Absteigend sortieren

    // Ränge berechnen
    const ranks = [];
    let currentRank = 1;

    sortedData.forEach((item, index) => {
      if (index > 0 && item.point < sortedData[index - 1].point) {
        currentRank = index + 1; // Nur erhöhen, wenn ein neuer, niedrigerer Punktwert kommt
      }
      ranks.push(currentRank);
    });

    // Namen und Punkte extrahieren
    const sortedNames = sortedData.map((item) => item.name);
    const sortedPoints = sortedData.map((item) => item.point);

    this.yahtzeeService.gameOver.next({
      names: sortedNames,
      points: sortedPoints,
      ranks,
    });
  }

  ngOnDestroy(): void {
    if (this.sendFinalDicesSubscription) {
      this.sendFinalDicesSubscription.unsubscribe();
    }
    if (this.startGameSunscription) {
      this.startGameSunscription.unsubscribe();
    }
  }
}
