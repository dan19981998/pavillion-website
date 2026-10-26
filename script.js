const menuToggle = document.querySelector('.menu-toggle');
const siteMenu = document.querySelector('.site-menu');

const setMenu = (open) => {
    menuToggle.setAttribute('aria-expanded', String(open));
    siteMenu.classList.toggle('is-open', open);
    // Stop the page scrolling behind the open menu
    document.documentElement.style.overflow = open ? 'hidden' : '';
    (open ? siteMenu.querySelector('.site-menu__close') : menuToggle).focus({ preventScroll: true });
};

menuToggle.addEventListener('click', () => setMenu(true));
siteMenu.querySelector('.site-menu__close').addEventListener('click', () => setMenu(false));

// Close on backdrop click, link click or Escape (links then smooth-scroll to their section)
siteMenu.addEventListener('click', (e) => {
    if (e.target === siteMenu || e.target.closest('a')) setMenu(false);
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && siteMenu.classList.contains('is-open')) setMenu(false);
});

document.querySelector('.enquire__form')?.addEventListener('submit', (e) => e.preventDefault());

const spacesTrack = document.querySelector('.spaces__track');

if (spacesTrack) {
    let isDown = false;
    let startX = 0;
    let startScroll = 0;
    let releaseTimer;
    const snapToNearestCard = () => {
        const inset = parseFloat(getComputedStyle(spacesTrack).scrollPaddingLeft) || 0;
        const maxScroll = spacesTrack.scrollWidth - spacesTrack.clientWidth;
        const current = spacesTrack.scrollLeft;

        let target = 0;
        for (const card of spacesTrack.children) {
            const pos = Math.min(card.offsetLeft - inset, maxScroll);
            if (Math.abs(pos - current) < Math.abs(target - current)) target = pos;
        }

        spacesTrack.scrollTo({ left: target, behavior: 'smooth' });
    };

    spacesTrack.addEventListener('pointerdown', (e) => {
        if (e.pointerType !== 'mouse' || e.button !== 0) return;
        e.preventDefault();
        clearTimeout(releaseTimer);
        isDown = true;
        startX = e.clientX;
        startScroll = spacesTrack.scrollLeft;
        spacesTrack.classList.add('is-dragging');
        spacesTrack.setPointerCapture(e.pointerId);
    });

    spacesTrack.addEventListener('pointermove', (e) => {
        if (!isDown) return;
        spacesTrack.scrollLeft = startScroll - (e.clientX - startX);
    });

    const endDrag = () => {
        if (!isDown) return;
        isDown = false;
        snapToNearestCard();
        // Re-enable CSS snapping once the smooth scroll has settled
        releaseTimer = setTimeout(() => spacesTrack.classList.remove('is-dragging'), 400);
    };

    spacesTrack.addEventListener('pointerup', endDrag);
    spacesTrack.addEventListener('pointercancel', endDrag);
}

// Gallery: filterable loop that scrolls on its own and can be dragged by mouse or thumb
const gallery = document.querySelector('.gallery');

if (gallery) {
    const viewport = gallery.querySelector('.gallery__viewport');
    const track = gallery.querySelector('.gallery__track');
    const filterButtons = gallery.querySelectorAll('.gallery__filters button');
    const items = [...track.children];
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const speed = reduceMotion ? 0 : 0.04; // px per ms

    let filter = 'all';
    let offset = 0;
    let loopWidth = 0;
    let dragging = false;
    let startX = 0;
    let startOffset = 0;
    let lastTime = performance.now();
    let lastWidth = viewport.clientWidth;
    let fadeTimer;
    let resizeTimer;

    // Repeat the filtered set until it overfills the screen, so the loop never shows a gap
    const build = () => {
        const set = items.filter((item) => filter === 'all' || item.dataset.category === filter);
        track.replaceChildren();
        if (!set.length) return;

        const addSet = (hidden) => set.forEach((item) => {
            const copy = item.cloneNode(true);
            if (hidden) copy.setAttribute('aria-hidden', 'true');
            track.append(copy);
        });

        addSet(false);
        addSet(true);
        loopWidth = track.children[set.length].offsetLeft - track.children[0].offsetLeft;
        for (let i = 0; i < 20 && track.offsetWidth < loopWidth + viewport.clientWidth; i++) addSet(true);
        offset = 0;
    };

    const tick = (now) => {
        const delta = Math.min(now - lastTime, 50);
        lastTime = now;
        if (!dragging) offset -= speed * delta;
        if (loopWidth) {
            offset %= loopWidth;
            if (offset > 0) offset -= loopWidth;
        }
        track.style.transform = `translate3d(${offset}px, 0, 0)`;
        requestAnimationFrame(tick);
    };

    viewport.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'mouse') {
            if (e.button !== 0) return;
            e.preventDefault();
        }
        dragging = true;
        startX = e.clientX;
        startOffset = offset;
        viewport.classList.add('is-dragging');
        viewport.setPointerCapture(e.pointerId);
    });

    viewport.addEventListener('pointermove', (e) => {
        if (dragging) offset = startOffset + (e.clientX - startX);
    });

    const stopDrag = () => {
        dragging = false;
        viewport.classList.remove('is-dragging');
    };

    viewport.addEventListener('pointerup', stopDrag);
    viewport.addEventListener('pointercancel', stopDrag);

    // Fade out, swap the images, fade back in
    filterButtons.forEach((button) => {
        button.addEventListener('click', () => {
            if (button.dataset.filter === filter) return;
            filter = button.dataset.filter;
            filterButtons.forEach((b) => b.setAttribute('aria-pressed', String(b === button)));

            track.classList.add('is-fading');
            clearTimeout(fadeTimer);
            fadeTimer = setTimeout(() => {
                build();
                track.classList.remove('is-fading');
            }, 300);
        });
    });

    // Only rebuild when the width changes (mobile address bar fires resize on scroll)
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            if (viewport.clientWidth === lastWidth) return;
            lastWidth = viewport.clientWidth;
            build();
        }, 150);
    });

    build();
    requestAnimationFrame(tick);
}

// FAQ accordion: only one answer open at a time
const faqItems = document.querySelectorAll('.faq__item');

faqItems.forEach((item) => {
    item.querySelector('.faq__toggle').addEventListener('click', () => {
        const willOpen = !item.classList.contains('is-open');

        faqItems.forEach((other) => {
            const open = other === item && willOpen;
            other.classList.toggle('is-open', open);
            other.querySelector('.faq__toggle').setAttribute('aria-expanded', String(open));
        });
    });
});

// Brochure flipbook (StPageFlip, assets/js/page-flip.browser.js): pages curl from the corner
// and follow the mouse or thumb. Two-page spreads, single pages on narrow screens.
const book = document.querySelector('.flipbook__book');

if (book && window.St) {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Wide landscape pages for desktop spreads; taller pages when it's one page at a time on mobile
    const mobile = window.matchMedia('(max-width: 768px)').matches;
    const minWidth = 280;
    // Same test StPageFlip uses to switch to one page at a time
    const single = mobile && book.offsetWidth < minWidth * 2;

    // One page at a time: each full-page photo moves to the top of the text page it faces in the spread
    if (single) {
        const pages = [...book.querySelectorAll('.flipbook__page')];
        pages.forEach((page, i) => {
            if (!page.classList.contains('flipbook__page--image')) return;
            const partner = pages[i % 2 ? i + 1 : i - 1];
            const img = page.querySelector('img');
            img.classList.add('flipbook__inset');
            partner.querySelector('.flipbook__content').prepend(img);
            partner.classList.add('has-inset');
            page.remove();
        });
    }

    // Phones: page height = the tallest page's content at the real page width, so it fits exactly
    const fitHeight = () => {
        book.style.setProperty('--measure-width', `${book.offsetWidth}px`);
        book.classList.add('is-measuring');
        const heights = [...book.querySelectorAll('.flipbook__page:not(.flipbook__cover)')]
            .map((page) => page.offsetHeight);
        // Back cover: the text gets 60% of the page under the photo
        const backText = book.querySelector('.flipbook__back-text');
        if (backText) heights.push(backText.offsetHeight / 0.6);
        book.classList.remove('is-measuring');
        return Math.ceil(Math.max(...heights)) + 8;
    };

    const start = () => {
        const pageFlip = new St.PageFlip(book, {
            // Page proportions; 'stretch' scales the book to fill its container
            width: single ? book.offsetWidth : mobile ? 500 : 600,
            height: single ? fitHeight() : mobile ? 850 : 480,
            size: 'stretch',
            minWidth,
            maxWidth: 1000,
            minHeight: 224,
            maxHeight: 2000,
            maxShadowOpacity: 0.5,
            flippingTime: reduceMotion ? 300 : 900,
            mobileScrollSupport: true,
            // First and last pages are stiff covers shown on their own
            showCover: true,
        });

        pageFlip.loadFromHTML(book.querySelectorAll('.flipbook__page'));

        // Closed book: slide it so the lone cover sits in the middle, then slide back to show the spread
        const stage = book.parentElement;
        const lastPage = pageFlip.getPageCount() - 1;

        const position = (opening) => {
            const page = pageFlip.getCurrentPageIndex();
            const portrait = pageFlip.getOrientation() === 'portrait';
            const closed = !opening && !portrait;
            stage.classList.toggle('is-portrait', portrait);
            stage.classList.toggle('is-front', closed && page === 0);
            stage.classList.toggle('is-back', closed && page === lastPage);
        };

        // Move as soon as a cover starts turning (drag or click); settle once the turn ends or is cancelled
        pageFlip.on('changeState', (e) => position(e.data === 'user_fold' || e.data === 'flipping'));
        pageFlip.on('flip', () => position(false));
        pageFlip.on('changeOrientation', () => position(false));
        position(false);

        book.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowRight') pageFlip.flipNext();
            if (e.key === 'ArrowLeft') pageFlip.flipPrev();
        });
    };

    // Measure with the real fonts, not the fallback
    if (single) {
        Promise.all(['400 16px Geist', '16px Kugile', '16px "Libre Baskerville"'].map((f) => document.fonts.load(f)))
            .catch(() => { })
            .then(start);
    } else {
        start();
    }
}
