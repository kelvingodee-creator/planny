export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <>
      <link rel="stylesheet" href="/style.css" />
      <section id="splashScreen" className="splash-screen" aria-label="Planny starten">
        <video id="introVideo" muted autoPlay playsInline preload="auto">
          <source src="/assets/planny-intro.mp4" type="video/mp4" />
        </video>
      </section>
      <section id="authShell" className="auth-shell">
        <div className="auth-card">
          <img className="auth-logo" src="/assets/planny-tune-logo-rail.png" alt="Planny" />
          <div>
            <p className="eyebrow">Planny Team</p>
            <h1>Log in</h1>
            <p className="auth-copy">Log in om jouw projecten en gedeelde teamtaken te zien.</p>
          </div>
          <form id="loginForm" className="auth-form">
            <label>
              <span>E-mail of naam</span>
              <input name="email" autoComplete="username" placeholder="naam@voorbeeld.nl" required />
            </label>
            <label>
              <span>Wachtwoord</span>
              <input name="password" type="password" autoComplete="current-password" required />
            </label>
            <button className="primary-button" type="submit">Log in</button>
          </form>
          <form id="signupForm" className="auth-form">
            <p className="mini-label">Eerste keer?</p>
            <div className="field-row">
              <label>
                <span>Naam</span>
                <input name="name" placeholder="Jouw naam" required />
              </label>
              <label>
                <span>E-mail</span>
                <input name="email" type="email" placeholder="naam@voorbeeld.nl" required />
              </label>
            </div>
            <label>
              <span>Wachtwoord</span>
              <input name="password" type="password" autoComplete="new-password" minLength={6} required />
            </label>
            <button className="soft-button" type="submit">Maak account</button>
          </form>
        </div>
      </section>

      <div id="planny-app" hidden>
        <aside className="rail" aria-label="Navigatie">
          <img className="rail-logo" src="/assets/planny-tune-logo-rail.png" alt="Planny" />
          <nav id="navList" className="nav-list"></nav>
          <div className="rail-bottom-actions">
            <button className="rail-folder-add" id="addFolderButton" type="button" title="Nieuwe map">+ Map</button>
            <button className="rail-add" id="quickAddButton" type="button" title="Nieuwe taak">+</button>
          </div>
        </aside>

        <main className="workspace">
          <header className="topbar">
            <div>
              <p className="eyebrow" id="viewEyebrow">Team workspace</p>
              <div className="title-line">
                <h1 id="viewTitle">All</h1>
              </div>
            </div>
            <div className="top-actions">
              <label className="search-box">
                <span>Zoek</span>
                <input id="searchInput" type="search" placeholder="taak, project, notitie" />
              </label>
              <button className="soft-button" id="archiveButton" type="button">Archief</button>
              <button className="soft-button" id="teamButton" type="button">Team</button>
              <button className="soft-button" id="addProjectButton" type="button">+ Project</button>
              <button className="primary-button" id="addTaskButton" type="button">+ Taak</button>
              <button className="soft-button settings-top-button" id="settingsButton" type="button" title="Instellingen" aria-label="Instellingen">⚙</button>
              <button className="soft-button logout-top-button" id="logoutButton" type="button">Uitloggen</button>
              <button className="soft-button mobile-options-button" id="mobileOptionsButton" type="button" aria-expanded="false">Meer</button>
            </div>
          </header>

          <section className="account-strip" aria-label="Account">
            <div>
              <p className="mini-label">Account</p>
              <button id="accountButton" className="account-pill" type="button">Kelvin</button>
            </div>
            <label className="team-task-toggle">
              <input id="showTeamTasksToggle" type="checkbox" />
              <span>Teamtaken tonen</span>
            </label>
          </section>

          <section id="board" className="board" aria-label="Planny board"></section>
        </main>

        <dialog id="taskDialog">
          <form method="dialog" className="dialog-card" id="taskForm">
            <div className="dialog-head">
              <div>
                <p className="eyebrow">Taak</p>
                <h2 id="taskDialogTitle">Nieuwe taak</h2>
              </div>
              <button className="icon-button" id="closeTaskButton" type="button" aria-label="Sluiten">×</button>
            </div>
            <label>
              <span>Titel</span>
              <input name="title" required maxLength={160} placeholder="Wat moet er gebeuren?" />
            </label>
            <label>
              <span>Notities</span>
              <textarea name="note" rows={4} placeholder="Context, stappen, links, reminders"></textarea>
            </label>
            <div className="field-row">
              <label>
                <span>Project</span>
                <select name="projectId" required></select>
              </label>
              <label>
                <span>Prioriteit</span>
                <select name="priority" required>
                  <option value="high">High prio</option>
                  <option value="medium">Medium prio</option>
                  <option value="someday">Ooit</option>
                </select>
              </label>
            </div>
            <div className="field-row">
              <label>
                <span>Deadline</span>
                <input name="deadline" type="datetime-local" />
              </label>
              <label>
                <span>Herinnering</span>
                <select name="reminderMinutes">
                  <option value="0">Geen mail</option>
                  <option value="15">15 minuten ervoor</option>
                  <option value="60">1 uur ervoor</option>
                  <option value="1440">1 dag ervoor</option>
                  <option value="2880">2 dagen ervoor</option>
                </select>
              </label>
            </div>
            <label className="check-pill reminder-toggle">
              <input name="reminderEmailEnabled" type="checkbox" />
              <span>Stuur mij een mail bij deze herinnering</span>
            </label>
            <fieldset>
              <legend>Voor wie?</legend>
              <div id="taskAssignees" className="check-grid"></div>
            </fieldset>
            <div className="dialog-actions">
              <button className="danger-button" id="deleteTaskButton" type="button">Verwijder</button>
              <span className="dialog-spacer"></span>
              <button className="soft-button" id="taskCancelButton" type="button">Annuleer</button>
              <button className="primary-button" id="saveTaskButton" type="submit">Bewaar</button>
            </div>
          </form>
        </dialog>

        <dialog id="projectDialog">
          <form method="dialog" className="dialog-card" id="projectForm">
            <div className="dialog-head">
              <div>
                <p className="eyebrow">Project</p>
                <h2 id="projectDialogTitle">Nieuw project</h2>
              </div>
              <button className="icon-button" value="cancel" type="submit" aria-label="Sluiten">×</button>
            </div>
            <label>
              <span>Naam</span>
              <input name="name" required maxLength={80} placeholder="Projectnaam" />
            </label>
            <label>
              <span>Samenvatting</span>
              <textarea name="summary" rows={3} placeholder="Waar gaat dit project over?"></textarea>
            </label>
            <fieldset>
              <legend>Projectleden</legend>
              <div id="projectMembers" className="check-grid"></div>
            </fieldset>
            <div className="dialog-actions">
              <button className="danger-button" id="deleteProjectButton" type="button">Verwijder</button>
              <span className="dialog-spacer"></span>
              <button className="soft-button" value="cancel" type="submit">Annuleer</button>
              <button className="primary-button" type="submit">Bewaar project</button>
            </div>
          </form>
        </dialog>

        <dialog id="categoryDialog">
          <form method="dialog" className="dialog-card" id="categoryForm">
            <div className="dialog-head">
              <div>
                <p className="eyebrow">Projectinstelling</p>
                <h2>Kopjes aanpassen</h2>
              </div>
              <button className="icon-button" id="closeCategoryButton" type="button" aria-label="Sluiten">×</button>
            </div>
            <p className="dialog-copy">Deze namen gelden alleen binnen dit project.</p>
            <div id="projectCategoryRows" className="project-category-rows"></div>
            <div className="dialog-actions">
              <span className="dialog-spacer"></span>
              <button className="soft-button" id="categoryCancelButton" type="button">Annuleer</button>
              <button className="primary-button" id="saveCategoryButton" type="submit">Bewaar kopjes</button>
            </div>
          </form>
        </dialog>

        <dialog id="folderDialog">
          <form method="dialog" className="dialog-card" id="folderForm">
            <div className="dialog-head">
              <div>
                <p className="eyebrow">Sidebar</p>
                <h2>Nieuwe map</h2>
              </div>
              <button className="icon-button" id="closeFolderButton" type="button" aria-label="Sluiten">×</button>
            </div>
            <label>
              <span>Naam van de map</span>
              <input name="name" required maxLength={60} placeholder="Bijvoorbeeld Team projecten" />
            </label>
            <fieldset>
              <legend>Projecten in deze map</legend>
              <div id="folderProjects" className="check-grid"></div>
            </fieldset>
            <div className="dialog-actions">
              <span className="dialog-spacer"></span>
              <button className="soft-button" id="folderCancelButton" type="button">Annuleer</button>
              <button className="primary-button" type="submit">Bewaar map</button>
            </div>
          </form>
        </dialog>

        <dialog id="teamDialog">
          <div className="dialog-card archive-card">
            <div className="dialog-head">
              <div>
                <p className="eyebrow">Team</p>
                <h2>Connecties</h2>
              </div>
              <button className="icon-button" id="closeTeamButton" type="button" aria-label="Sluiten">×</button>
            </div>
            <form id="connectionForm" className="team-account-form">
              <label>
                <span>Zoek teamlid op e-mail</span>
                <input name="targetEmail" type="email" placeholder="wiebe@planny.local" required />
              </label>
              <fieldset>
                <legend>Rechten die jij aan deze persoon vraagt/geeft</legend>
                <div className="check-grid">
                  <label className="check-pill">
                    <input type="checkbox" name="canViewSharedProjects" defaultChecked />
                    <span>Gedeelde projecten zien</span>
                  </label>
                  <label className="check-pill">
                    <input type="checkbox" name="canCreateTasks" defaultChecked />
                    <span>Taken voor mij maken</span>
                  </label>
                  <label className="check-pill">
                    <input type="checkbox" name="canCreateProjects" />
                    <span>Projecten met mij maken</span>
                  </label>
                  <label className="check-pill">
                    <input type="checkbox" name="canViewAllTasks" />
                    <span>Alle mijn taken zien</span>
                  </label>
                </div>
              </fieldset>
              <button className="primary-button" type="submit">Verstuur connectierequest</button>
            </form>
            <div id="connectionList" className="archive-list"></div>
            <form id="teamAccountForm" className="team-account-form">
              <p className="mini-label">Teamaccount maken</p>
              <div className="field-row">
                <label>
                  <span>Naam</span>
                  <input name="name" placeholder="Wiebe" required />
                </label>
                <label>
                  <span>E-mail</span>
                  <input name="email" type="email" placeholder="wiebe@planny.local" required />
                </label>
              </div>
              <div className="field-row">
                <label>
                  <span>Tijdelijk wachtwoord</span>
                  <input name="password" type="password" minLength={6} required />
                </label>
                <button className="primary-button" type="submit">Maak teamlid</button>
              </div>
            </form>
            <div id="teamList" className="archive-list"></div>
          </div>
        </dialog>

        <dialog id="archiveDialog">
          <div className="dialog-card archive-card">
            <div className="dialog-head">
              <div>
                <p className="eyebrow">Archief</p>
                <h2>Afgevinkte taken</h2>
              </div>
              <button className="icon-button" id="closeArchiveButton" type="button" aria-label="Sluiten">×</button>
            </div>
            <div id="archiveList" className="archive-list"></div>
          </div>
        </dialog>
      </div>
      <script src="/app.js" defer></script>
    </>
  );
}
