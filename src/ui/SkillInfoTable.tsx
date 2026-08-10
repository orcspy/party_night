import { getPlayerSkillInfoRows } from '../game/skillInfo'

const PLAYER_SKILL_INFO_ROWS = getPlayerSkillInfoRows()

export function SkillInfoTable() {
  return (
    <div className="skill-info-viewport" role="region" aria-label="전체 스킬 정보" tabIndex={0}>
      <table className="skill-info-table">
        <colgroup>
          <col className="skill-info-col-name" />
          <col className="skill-info-col-class" />
          <col className="skill-info-col-classification" />
          <col className="skill-info-col-level" />
          <col className="skill-info-col-target" />
          <col className="skill-info-col-dice" />
          <col className="skill-info-col-modifier" />
          <col className="skill-info-col-cooldown" />
          <col className="skill-info-col-effect" />
        </colgroup>
        <thead>
          <tr>
            <th scope="col">스킬 이름</th>
            <th scope="col">직업</th>
            <th scope="col">분류</th>
            <th scope="col">Lv</th>
            <th scope="col">대상</th>
            <th scope="col">다이스</th>
            <th scope="col">보정</th>
            <th scope="col">쿨타임</th>
            <th scope="col">효과</th>
          </tr>
        </thead>
        <tbody>
          {PLAYER_SKILL_INFO_ROWS.map((row) => (
            <tr key={row.skillId}>
              <th scope="row">{row.name}</th>
              <td>{row.classLabel}</td>
              <td>{row.classificationLabel}</td>
              <td>{row.unlockLevel}</td>
              <td>{row.targetLabel}</td>
              <td>{row.diceLabel}</td>
              <td>{row.fixedModifierLabel}</td>
              <td>{row.cooldownRounds}</td>
              <td>{row.effectNote}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
