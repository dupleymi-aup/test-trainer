# Remote Setup

This project uses two remotes for synchronized pushing:
- **GitHub**: git@github.com:dupleymi-aup/test-trainer.git
- **GitVerse**: git@gitverse.ru:dupleymi-amp/test-trainer.git

## After cloning, configure remotes:

```bash
bash setup-remotes.sh
```

Or manually:

```bash
git remote add origin git@github.com:dupleymi-aup/test-trainer.git
git remote add gitverse git@gitverse.ru:dupleymi-amp/test-trainer.git
git remote set-url origin --add --push git@github.com:dupleymi-aup/test-trainer.git
git remote set-url origin --add --push git@gitverse.ru:dupleymi-amp/test-trainer.git
```

Now `git push` sends to both repositories simultaneously.
