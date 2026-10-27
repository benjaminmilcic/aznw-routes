{
    question: {
      en: "",
      de: "",
      hr: "",
    },
    options: {
      en: ['', '', '', ''],
      de: ['', '', '', ''],
      hr: ['', '', '', ''],
    },
    correctAnswerIndex: , // 
  },




Wer schrieb "Die Verwandlung"?

A) Franz Kafka

B) Thomas Mann

C) Hermann Hesse

D) Friedrich Nietzsche
Richtige Antwort: A) Franz Kafka

Film & Fernsehen
Wer spielte die Hauptrolle in "Titanic"?

A) Brad Pitt

B) Leonardo DiCaprio

C) Tom Cruise

D) Johnny Depp
Richtige Antwort: B) Leonardo DiCaprio

Welcher Film handelt von einem Zauberer namens Harry Potter?

A) Herr der Ringe

B) Der Hobbit

C) Harry Potter und der Stein der Weisen

D) Narnia
Richtige Antwort: C) Harry Potter und der Stein der Weisen

Wer ist der Regisseur von "Inception"?

A) Steven Spielberg

B) Christopher Nolan

C) Quentin Tarantino

D) Martin Scorsese
Richtige Antwort: B) Christopher Nolan

Welche Serie handelt von einer Gruppe von Freunden in New York?

A) How I Met Your Mother

B) Friends

C) The Big Bang Theory

D) Breaking Bad
Richtige Antwort: B) Friends

Wer spielte die Hauptrolle in "Forrest Gump"?

A) Tom Hanks

B) Kevin Costner

C) Dustin Hoffman

D) Robert De Niro
Richtige Antwort: A) Tom Hanks

Musik
Wer ist der "King of Pop"?

A) Elvis Presley

B) Michael Jackson

C) Prince

D) Madonna
Richtige Antwort: B) Michael Jackson

Welche Band sang "Bohemian Rhapsody"?

A) The Beatles

B) Queen

C) Led Zeppelin

D) Pink Floyd
Richtige Antwort: B) Queen

Wer ist der Autor von "Imagine"?

A) John Lennon

B) Paul McCartney

C) Bob Dylan

D) Elton John
Richtige Antwort: A) John Lennon

Welcher Künstler veröffentlichte das Album "Thriller"?

A) Prince

B) Michael Jackson

C) Madonna

D) Whitney Houston
Richtige Antwort: B) Michael Jackson

Welche Band besteht aus John, Paul, George und Ringo?

A) The Rolling Stones

B) The Beatles

C) The Who

D) The Kinks
Richtige Antwort: B) The Beatles

Sport
Welches Land gewann die FIFA-Weltmeisterschaft 2018?

A) Deutschland

B) Frankreich

C) Brasilien

D) Spanien
Richtige Antwort: B) Frankreich

Wer ist der beste Fußballspieler aller Zeiten?

A) Lionel Messi

B) Cristiano Ronaldo

C) Pelé

D) Diego Maradona
Richtige Antwort: C) Pelé

Welche Sportart wird beim Wimbledon-Turnier gespielt?

A) Golf

B) Tennis

C) Cricket

D) Badminton
Richtige Antwort: B) Tennis

Wer hält den Rekord für die meisten Olympia-Goldmedaillen?

A) Usain Bolt

B) Michael Phelps

C) Carl Lewis

D) Simone Biles
Richtige Antwort: B) Michael Phelps

Welches Land ist bekannt für seine Cricket-Mannschaft?

A) Australien

B) Indien

C) England

D) Pakistan
Richtige Antwort: B) Indien

Technologie
Wer ist der Gründer von Microsoft?

A) Steve Jobs

B) Bill Gates

C) Mark Zuckerberg

D) Elon Musk
Richtige Antwort: B) Bill Gates

Welches Unternehmen entwickelte das iPhone?

A) Samsung

B) Apple

C) Google

D) Huawei
Richtige Antwort: B) Apple

Was ist das meistgenutzte Betriebssystem der Welt?

A) Windows

B) macOS

C) Linux

D) Android
Richtige Antwort: D) Android

Wer ist der Gründer von Tesla?

A) Jeff Bezos

B) Elon Musk

C) Larry Page

D) Steve Wozniak
Richtige Antwort: B) Elon Musk

Welche Programmiersprache wurde von Guido van Rossum entwickelt?

A) Java

B) Python

C) C++

D) JavaScript
Richtige Antwort: B) Python

Politik
Wer ist der aktuelle Präsident der USA (2023)?

A) Donald Trump

B) Joe Biden

C) Barack Obama

D) Kamala Harris
Richtige Antwort: B) Joe Biden

Welches Land hat die meisten Einwohner?

A) Indien

B) USA

C) China

D) Indonesien
Richtige Antwort: C) China

Wer ist der Premierminister von Kanada?

A) Justin Trudeau

B) Stephen Harper

C) Andrew Scheer

D) Jagmeet Singh
Richtige Antwort: A) Justin Trudeau

Welches Land ist bekannt für seine Neutralität?

A) Schweiz

B) Österreich

C) Schweden

D) Finnland
Richtige Antwort: A) Schweiz

Wer ist der aktuelle Bundeskanzler von Deutschland?

A) Angela Merkel

B) Olaf Scholz

C) Annalena Baerbock

D) Christian Lindner
Richtige Antwort: B) Olaf Scholz

export interface Question {
  question: { en: string; de: string; hr: string };
  options: { en: string[]; de: string[]; hr: string[] };
  correctAnswerIndex: number;
}

export const QUESTIONS: Question[] = [
{
    question: {
      en: "",
      de: "Was ist die Hauptstadt von Frankreich?",
      hr: "",
    },
    options: {
      en: ['', '', '', ''],
      de: ['Berlin', 'Madrid', 'Paris', 'Rom'],
      hr: ['', '', '', ''],
    },
    correctAnswerIndex: 2, // Paris 
  },
{
    question: {
      en: "",
      de: "Wie viele Planeten gibt es in unserem Sonnensystem?",
      hr: "",
    },
    options: {
      en: ['', '', '', ''],
      de: ['7', '8', '9', '10'],
      hr: ['', '', '', ''],
    },
    correctAnswerIndex: 1, // 8
  },
{
    question: {
      en: "",
      de: 'Wer schrieb "Faust"?',
      hr: "",
    },
    options: {
      en: ['', '', '', ''],
      de: ['Friedrich Schiller', 'Johann Wolfgang von Goethe', 'Heinrich Heine', 'Thomas Mann'],
      hr: ['', '', '', ''],
    },
    correctAnswerIndex: 1, // Johann Wolfgang von Goethe
  },
{
    question: {
      en: "",
      de: 'Welches Element hat das chemische Symbol "O"?',
      hr: "",
    },
    options: {
      en: ['', '', '', ''],
      de: ['Gold', 'Sauerstoff', 'Eisen', 'Kohlenstoff'],
      hr: ['', '', '', ''],
    },
    correctAnswerIndex: 1, // Oxygen
    },
  {
    question: {
      en: "",
      de: 'In welchem Jahr endete der Zweite Weltkrieg?',
      hr: "",
    },
    options: {
      en: ['', '', '', ''],
      de: ['1943', '1945', '1947', '1950'],
      hr: ['', '', '', ''],
    },
    correctAnswerIndex: 1, // 1945
    },
  {
    question: {
      en: "",
      de: "Welcher Fluss fließt durch Paris?",
      hr: "",
    },
    options: {
      en: ['', '', '', ''],
      de: ['Themse', 'Donau', 'Seine', 'Rhein'],
      hr: ['', '', '', ''],
    },
    correctAnswerIndex: 2, // Seine
    },
  {
    question: {
      en: "",
      de: "Wie heißt der höchste Berg der Welt?",
      hr: "",
    },
    options: {
      en: ['', '', '', ''],
      de: ['K2', 'Mount Everest', 'Kangchendzönga', 'Lhotse'],
      hr: ['', '', '', ''],
    },
    correctAnswerIndex: 1, // Mount Everest
    },
  {
    question: {
      en: "",
      de: "In welchem Land liegt die Sahara-Wüste?",
      hr: "",
    },
    options: {
      en: ['', '', '', ''],
      de: ['Ägypten', 'Marokko', 'Algerien', 'Alle genannten'],
      hr: ['', '', '', ''],
    },
    correctAnswerIndex: 3, // All of the above
    },
  {
    question: {
      en: "",
      de: "Welcher Ozean ist der größte?",
      hr: "",
    },
    options: {
      en: ['', '', '', ''],
      de: ['Atlantischer Ozean', 'Indischer Ozean', 'Arktischer Ozean', 'Pazifischer Ozean'],
      hr: ['', '', '', ''],
    },
    correctAnswerIndex: 3, // Pacific Ocean
    },
  {
    question: {
      en: "",
      de: "Wie heißt die Hauptstadt von Australien?",
      hr: "",
    },
    options: {
      en: ['', '', '', ''],
      de: ['Sydney', 'Melbourne', 'Canberra', 'Brisbane'],
      hr: ['', '', '', ''],
    },
    correctAnswerIndex: 2, // Canberra
    },
  {
    question: {
      en: "",
      de: "Wer war der erste Präsident der USA?",
      hr: "",
    },
    options: {
      en: ['', '', '', ''],
      de: ['Thomas Jefferson', 'Abraham Lincoln', 'George Washington', 'John Adams'],
      hr: ['', '', '', ''],
    },
    correctAnswerIndex: 2, // George Washington
    },
  {
    question: {
      en: "",
      de: "In welchem Jahr begann der Erste Weltkrieg?",
      hr: "",
    },
    options: {
      en: ['', '', '', ''],
      de: ['1912', '1914', '1916', '1918'],
      hr: ['', '', '', ''],
    },
    correctAnswerIndex: 1, // 1914
    },
  {
    question: {
      en: "",
      de: "Wer war der erste Mensch auf dem Mond?",
      hr: "",
    },
    options: {
      en: ['', '', '', ''],
      de: ['Buzz Aldrin', 'Neil Armstrong', 'Michael Collins', 'Yuri Gagarin'],
      hr: ['', '', '', ''],
    },
    correctAnswerIndex: 1, // Neil Armstrong
    },
  {
    question: {
      en: "",
      de: "Welche antike Zivilisation baute die Pyramiden?",
      hr: "",
    },
    options: {
      en: ['', '', '', ''],
      de: ['Griechen', 'Römer', 'Ägypter', 'Mesopotamier'],
      hr: ['', '', '', ''],
    },
    correctAnswerIndex: 2, // Egyptians
  },
{
    question: {
      en: "",
      de: "Wer war der Anführer der Sowjetunion während des Zweiten Weltkriegs?",
      hr: "",
    },
    options: {
      en: ['', '', '', ''],
      de: ['Lenin', 'Stalin', 'Trotzki', 'Chruschtschow'],
      hr: ['', '', '', ''],
    },
    correctAnswerIndex: 1, // Stalin
    },
  {
    question: {
      en: "",
      de: "Was ist die chemische Formel für Wasser?",
      hr: "",
    },
    options: {
      en: ['', '', '', ''],
      de: ['CO2', 'H2O', 'O2', 'NaCl'],
      hr: ['', '', '', ''],
    },
    correctAnswerIndex: 1, // H2O
    },
  {
    question: {
      en: "",
      de: "Wer entdeckte die Schwerkraft?",
      hr: "",
    },
    options: {
      en: ['', '', '', ''],
      de: ['Albert Einstein', 'Isaac Newton', 'Galileo Galilei', 'Nikola Tesla'],
      hr: ['', '', '', ''],
    },
    correctAnswerIndex: 1, // Isaac Newton
  },
  {
    question: {
      en: "",
      de: "Was ist die Lichtgeschwindigkeit?",
      hr: "",
    },
    options: {
      en: ['', '', '', ''],
      de: ['300.000 km/s', '150.000 km/s', '450.000 km/s', '600.000 km/s'],
      hr: ['', '', '', ''],
    },
    correctAnswerIndex: 0, // 300.000 km/s
  },
  {
    question: {
      en: "",
      de: "Welches Element hat die höchste Dichte?",
      hr: "",
    },
    options: {
      en: ['', '', '', ''],
      de: ['Gold', 'Blei', 'Uran', 'Osmium'],
      hr: ['', '', '', ''],
    },
    correctAnswerIndex: 3, // Osmium
  },
  {
    question: {
      en: "",
      de: "Wer entwickelte die Relativitätstheorie?",
      hr: "",
    },
    options: {
      en: ['', '', '', ''],
      de: ['Niels Bohr', 'Albert Einstein', 'Max Planck', 'Werner Heisenberg'],
      hr: ['', '', '', ''],
    },
    correctAnswerIndex: 1, // Albert Einstein
  },
  {
    question: {
      en: "",
      de: 'Wer schrieb "1984"?',
      hr: "",
    },
    options: {
      en: ['', '', '', ''],
      de: ['Aldous Huxley', 'George Orwell', 'Franz Kafka', 'Ray Bradbury'],
      hr: ['', '', '', ''],
    },
    correctAnswerIndex: 1, // George Orwell
  },
  {
    question: {
      en: "",
      de: "Welches Buch handelt von einem Jungen namens Harry Potter?",
      hr: "",
    },
    options: {
      en: ['', '', '', ''],
      de: ['Der Herr der Ringe', 'Die Chroniken von Narnia', 'Harry Potter und der Stein der Weisen', 'Der kleine Prinz'],
      hr: ['', '', '', ''],
    },
    correctAnswerIndex: 2, // Harry Potter and the Philosopher's Stone
  },
  {
    question: {
      en: "",
      de: 'Wer ist der Autor von "Der kleine Prinz"?',
      hr: "",
    },
    options: {
      en: ['', '', '', ''],
      de: ['Antoine de Saint-Exupéry', 'Jules Verne', 'Mark Twain', 'Charles Dickens'],
      hr: ['', '', '', ''],
    },
    correctAnswerIndex: 0, // Antoine de Saint-Exupéry
  },
  {
    question: {
      en: "",
      de: 'Welches literarische Werk beginnt mit den Worten "Es war die beste und die schlimmste Zeit"?',
      hr: "",
    },
    options: {
      en: ['', '', '', ''],
      de: ['Krieg und Frieden', 'Eine Geschichte aus zwei Städten', 'Stolz und Vorurteil', 'Moby Dick'],
      hr: ['', '', '', ''],
    },
    correctAnswerIndex: 1, // A Tale of Two Cities
  },
  {
    question: {
      en: "",
      de: "",
      hr: "",
    },
    options: {
      en: ['', '', '', ''],
      de: ['', '', '', ''],
      hr: ['', '', '', ''],
    },
    correctAnswerIndex: , // 
  },
]