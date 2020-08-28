import { Component, h, State, Watch } from '@stencil/core'
import { map, range, uniqBy, sum, orderBy } from 'lodash-es'
import BigNumber from 'bignumber.js'
import faker from 'faker'
import queryString from 'query-string'

interface Entry {
  title: string,
  image: string,
  votes: number,
  flag: boolean
}

@Component({
  tag: 'app-home',
  styleUrl: 'app-home.scss'
})
export class AppHome {
  @State() isSeedFund: boolean

  @State() entries: Array<Entry>
  @State() prize: number
  @State() price: number = 0.08
  @State() flagPrice: number

  @State() creditsTotal: number = 100
  @State() creditsUsed: number = 0

  @State() voteOthersReal: Array<number>
  @State() voteOthersAbsolute: Array<number>
  @State() voteTotalReal: Array<number>
  @State() voteTotalAbsolute: Array<number>

  @Watch('entries')
  entriesWatchHandler(entries: Array<Entry>) {
    this.creditsUsed = sum([
      ...map(entries, (entry: Entry) => entry.votes * entry.votes),
      ...map(entries, (entry: Entry) => entry.flag && entry.votes ? this.flagPrice : 0)
    ])
    this.voteTotalReal = map(entries, (entry, i) => entry.votes * Math.abs(entry.votes) + this.voteOthersReal[i], 0)
    this.voteTotalAbsolute = map(this.voteTotalReal, (voteTotal) => Math.max(voteTotal, 0))
    this.voteOthersAbsolute = map(this.voteOthersReal, (voteTotal) => Math.max(voteTotal, 0))
  }

  componentWillLoad() {
    const parsed = queryString.parse(location.search)

    this.isSeedFund = parsed.isSeedFund && parsed.isSeedFund === 'true'

    if (this.isSeedFund) {
      this.prize = 5000000
      this.flagPrice = Math.floor(this.creditsTotal / (2 + 1))
      this.voteOthersReal = [300,250,200,150,100,3]
    }

    else {
      this.prize = 500000
      this.flagPrice = Math.floor(this.creditsTotal / (5 + 1))
      this.voteOthersReal = [160,150,140,130,120,110,100,90,80,70,60,50]
    }

    faker.seed(this.prize)

    this.entries = orderBy(map(range(
      this.voteOthersReal.length
    ), () => {
      return {
        title: faker.commerce.productName(),
        votes: 0
      }
    }), 'title', 'desc')
  }

  vote(entry: Entry, i: number) {
    if (entry.votes + i === 0)
      entry.flag = false

    this.entries = orderBy(uniqBy([
      {
        ...entry,
        votes: entry.votes + i
      },
      ...this.entries,
    ], 'title'), 'title', 'desc')
  }

  flag(entry: Entry) {
    this.entries = orderBy(uniqBy([
      {
        ...entry,
        flag: !entry.flag
      },
      ...this.entries,
    ], 'title'), 'title', 'desc')
  }

  render() {
    return [
      <h1>Flaggable Quadratic Voting Demo</h1>,
      <table>
        <tbody>
          <tr>
            <td>Total Credits:</td>
            <td>{this.creditsTotal}</td>
          </tr>
          <tr>
            <td>Used Credits:</td>
            <td>{this.creditsUsed}</td>
          </tr>
          <tr>
            <td>Credits Left:</td>
            <td>{this.creditsTotal - this.creditsUsed}</td>
          </tr>
        </tbody>
      </table>,
      <ul>
        {this.entries.map((entry, index) =>
          <li>
            <h1>
              {entry.title}

              <button class={entry.flag ? 'flagged' : null} onClick={() => this.flag(entry)} disabled={
                !entry.votes
                || (
                  !entry.flag
                  && this.creditsUsed + this.flagPrice > this.creditsTotal
                )
              }>
                <span>🚩</span>
                +{this.flagPrice}
              </button>
            </h1>

            <h2 class={
              this.voteTotalReal[index] < 0
              ? this.voteTotalReal[index] === this.voteOthersReal[index]
                ? null
                : this.voteTotalReal[index] - this.voteOthersReal[index] > 0
                  ? 'positive'
                  : 'negative'
              : new BigNumber(this.voteTotalAbsolute[index])
                  .div(BigNumber.sum(...this.voteTotalAbsolute))
                  .minus(
                    new BigNumber(this.voteOthersAbsolute[index])
                    .div(BigNumber.sum(...this.voteOthersAbsolute))
                  )
                  .times(this.prize)
                  .dp(2)
                  .isZero()
                ? null
                : new BigNumber(this.voteTotalAbsolute[index])
                  .div(BigNumber.sum(...this.voteTotalAbsolute))
                  .minus(
                    new BigNumber(this.voteOthersAbsolute[index])
                    .div(BigNumber.sum(...this.voteOthersAbsolute))
                  )
                  .times(this.prize)
                  .isPositive()
                    ? 'positive'
                    : 'negative'
            }>
              {
                this.voteOthersReal[index] < 0
                ? this.voteOthersReal[index] +' credits'
                : '$'+ new BigNumber(this.voteOthersAbsolute[index])
                  .div(BigNumber.sum(...this.voteOthersAbsolute))
                  .times(this.prize)
                  .times(this.price)
                  .toFormat(2)
              }
              <br/>
              {
                entry.votes * entry.votes
              } credits {
                '→ $'+ new BigNumber(this.voteTotalAbsolute[index])
                  .div(BigNumber.sum(...this.voteTotalAbsolute))
                  .minus(
                    new BigNumber(this.voteOthersAbsolute[index])
                    .div(BigNumber.sum(...this.voteOthersAbsolute))
                  )
                  .times(this.prize)
                  .times(this.price)
                  .abs()
                  .toFormat(2)
              }
              <br/>
              <strong>
                {
                  '$'+ new BigNumber(this.voteTotalAbsolute[index])
                    .div(BigNumber.sum(...this.voteTotalAbsolute))
                    .times(this.prize)
                    .times(this.price)
                    .toFormat(2)
                }
              </strong>
            </h2>

            <div class="actions">
              <button class="up" onClick={() => this.vote(entry, +1)} disabled={
                (
                  (this.creditsUsed - entry.votes * entry.votes)
                  +
                  ((entry.votes + 1) * (entry.votes + 1))
                ) > this.creditsTotal}>
                {
                  entry.votes > 0 ? entry.votes : null
                } 👍 <span>
                  {
                    '+$'+ BigNumber.max(
                        this.voteOthersReal[index] + (entry.votes + 1) * Math.abs(entry.votes + 1),
                        0
                      )
                      .div(
                        BigNumber.sum(
                          ...this.voteTotalAbsolute,
                          this.voteOthersReal[index],
                          -this.voteTotalAbsolute[index],
                          (entry.votes + 1) * Math.abs(entry.votes + 1),
                        )
                      )
                      .minus(
                        new BigNumber(this.voteTotalAbsolute[index])
                        .div(BigNumber.sum(...this.voteTotalAbsolute))
                      )
                      .times(this.prize)
                      .times(this.price)
                      .toFormat(2)
                  }
                </span>
              </button>

              <button class="down" onClick={() => this.vote(entry, -1)} disabled={
                (
                  (this.creditsUsed - entry.votes * entry.votes)
                  +
                  ((entry.votes - 1) * (entry.votes - 1))
                ) > this.creditsTotal}>
                {
                  entry.votes < 0 ? Math.abs(entry.votes) : null
                } 👎 <span>
                  {
                    '-$'+
                      BigNumber.max(
                        this.voteOthersReal[index] + (entry.votes - 1) * Math.abs(entry.votes - 1),
                        0
                      )
                      .div(
                        BigNumber.sum(
                          ...this.voteTotalAbsolute,
                          this.voteOthersReal[index],
                          -this.voteTotalAbsolute[index],
                          (entry.votes - 1) * Math.abs(entry.votes - 1),
                        )
                      )
                      .minus(
                        new BigNumber(this.voteTotalAbsolute[index])
                        .div(BigNumber.sum(...this.voteTotalAbsolute))
                      )
                      .times(this.prize)
                      .times(this.price)
                      .abs()
                      .toFormat(2)
                  }
                </span>
              </button>
            </div>
          </li>
        )}
      </ul>
    ]
  }
}
